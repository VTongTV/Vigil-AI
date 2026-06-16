"""POST /api/v1/detect — Upload image and detect traffic violations.

Main detection endpoint. Processes uploaded image through the full pipeline:
    Preprocess → COCO detect → Helmet detect → Violation logic → Plate detect → OCR → Evidence
"""

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from backend.app.config import get_violation_config, settings
from backend.app.core.evidence import (
    VIOLATION_INFO,
    generate_evidence_image,
    get_evidence_url,
    save_evidence_image,
)
from backend.app.core.ocr import process_plates
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import detect_all_violations
from backend.app.db.database import SessionLocal
from backend.app.db.models import (
    FINE_SCHEDULE,
    ViolationRecordDB,
    ViolationStatusDB,
    get_confidence_tier,
)
from backend.app.schemas import (
    Bbox,
    ConfidenceTier,
    DataSource,
    DetectResponse,
    ImageDimensions,
    LicensePlateResult,
    TimingBreakdown,
    ViolationRecord,
    ViolationStatus,
    ViolationType,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/detect", response_model=DetectResponse)
async def detect_violations(
    request: Request,
    image: UploadFile = File(...),
    camera_id: Optional[str] = Form(None),
):
    """Upload a traffic camera image and detect violations.

    Args:
        image: JPEG/PNG image file (max 10MB).
        camera_id: Optional camera identifier for location context.

    Returns:
        Detection results with violations, timing, and evidence URLs.
    """
    start_time = time.time()

    # Validate file
    if not image.content_type or image.content_type not in (
        "image/jpeg", "image/png", "image/jpg", "image/webp"
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image format: {image.content_type}. Use JPEG or PNG.",
        )

    contents = await image.read()
    if len(contents) > settings.max_image_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Max {settings.max_image_size_mb}MB.",
        )

    # Decode image
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    img_h, img_w = img_bgr.shape[:2]

    # Step 1: Preprocessing
    t0 = time.time()
    preprocessed = preprocess_image(img_bgr)
    preprocess_ms = int((time.time() - t0) * 1000)

    # Step 2: COCO detection (resident)
    t0 = time.time()
    mm = request.app.state.model_manager
    if mm is None or not mm.is_ready():
        raise HTTPException(status_code=503, detail="Models not loaded")
    coco_dets = mm.detect_coco(preprocessed)
    detect_coco_ms = int((time.time() - t0) * 1000)

    # Step 3: Helmet detection (resident)
    t0 = time.time()
    helmet_dets = mm.detect_helmet(preprocessed)
    detect_helmet_ms = int((time.time() - t0) * 1000)

    # Step 4: Violation logic
    t0 = time.time()
    # Get configured polygons from violation configs
    wrong_side_cfg = get_violation_config("wrong_side")
    parking_cfg = get_violation_config("illegal_parking")
    stop_line_cfg = get_violation_config("stop_line")
    red_light_cfg = get_violation_config("red_light")

    violations = detect_all_violations(
        coco_detections=coco_dets,
        helmet_detections=helmet_dets,
        img_w=img_w,
        img_h=img_h,
        lane_polygons=wrong_side_cfg.get("lane_polygons", []),
        no_parking_zones=parking_cfg.get("zone_polygons", []),
        stop_line_zones=stop_line_cfg.get("stop_line_zones", []),
        signal_state=red_light_cfg.get("signal_state", "unknown"),
    )
    violation_logic_ms = int((time.time() - t0) * 1000)

    # Step 5: Plate detection + OCR (on-demand, only if violations found)
    plate_results = []
    detect_plate_ms = 0
    ocr_ms = 0

    if violations:
        t0 = time.time()
        plate_dets = mm.detect_plate_on_demand(preprocessed)
        detect_plate_ms = int((time.time() - t0) * 1000)

        if plate_dets:
            t0 = time.time()
            plate_results = process_plates(preprocessed, plate_dets, img_w, img_h)
            ocr_ms = int((time.time() - t0) * 1000)

    # Step 6: Evidence generation
    t0 = time.time()
    if violations:
        annotated, filename, evidence_hash = generate_evidence_image(
            img_bgr, violations, plate_results, camera_id
        )
        filepath = save_evidence_image(annotated, filename)
        evidence_url = get_evidence_url(filename)
    else:
        evidence_url = None
        evidence_hash = None
        filename = None
    evidence_gen_ms = int((time.time() - t0) * 1000)

    # Build violation records for response
    now = datetime.now(timezone.utc)
    violation_records = []

    for i, v in enumerate(violations):
        v_type = v["type"]
        info = VIOLATION_INFO.get(v_type, {"section": "177", "amount": 200})
        fine_info = FINE_SCHEDULE.get(v_type, {"section": "177", "amount": 200})
        conf = v["confidence"]
        tier = get_confidence_tier(conf)

        # Try to associate a plate with this violation
        plate_result = None
        if plate_results:
            pr = plate_results[0]  # Simple: associate first plate
            plate_result = LicensePlateResult(
                text=pr["text"],
                confidence=pr["confidence"],
                bbox=Bbox(**{k: pr["bbox"][j] for j, k in enumerate(["x1", "y1", "x2", "y2"])}),
            )

        v_id = f"v_{now.strftime('%Y%m%d_%H%M%S')}_{i:03d}"

        record = ViolationRecord(
            id=v_id,
            violation_type=ViolationType(v_type),
            confidence=conf,
            confidence_tier=ConfidenceTier(tier),
            bbox=Bbox(
                x1=v["bbox"][0], y1=v["bbox"][1],
                x2=v["bbox"][2], y2=v["bbox"][3],
            ),
            person_bbox=Bbox(
                x1=v["person_bbox"][0], y1=v["person_bbox"][1],
                x2=v["person_bbox"][2], y2=v["person_bbox"][3],
            ) if v.get("person_bbox") and isinstance(v["person_bbox"], list) else None,
            metadata=v.get("metadata", {}),
            mv_act_section=str(fine_info["section"]),
            fine_amount=int(fine_info["amount"]),
            license_plate=plate_result,
            status=ViolationStatus.PENDING,
            data_source=DataSource.LIVE,
            camera_id=camera_id,
            timestamp=now,
            evidence_url=evidence_url,
            evidence_hash=evidence_hash,
        )
        violation_records.append(record)

        # Persist to database
        _save_violation_to_db(record, v, plate_results, camera_id)

    total_ms = int((time.time() - start_time) * 1000)

    return DetectResponse(
        success=True,
        processing_time_ms=total_ms,
        timing_breakdown=TimingBreakdown(
            preprocess_ms=preprocess_ms,
            detect_coco_ms=detect_coco_ms,
            detect_helmet_ms=detect_helmet_ms,
            violation_logic_ms=violation_logic_ms,
            detect_plate_ms=detect_plate_ms,
            ocr_ms=ocr_ms,
            evidence_gen_ms=evidence_gen_ms,
        ),
        violations=violation_records,
        image_dimensions=ImageDimensions(width=img_w, height=img_h),
    )


def _save_violation_to_db(
    record: ViolationRecord,
    raw_violation: dict,
    plate_results: list[dict],
    camera_id: Optional[str],
) -> None:
    """Persist a violation record to the database.

    Args:
        record: Pydantic ViolationRecord.
        raw_violation: Raw violation dict from detection.
        plate_results: Plate OCR results.
        camera_id: Camera identifier.
    """
    db = SessionLocal()
    try:
        plate_text = None
        plate_conf = None
        plate_bbox = None
        if plate_results:
            plate_text = plate_results[0].get("text")
            plate_conf = plate_results[0].get("confidence")
            plate_bbox = plate_results[0].get("bbox")

        db_record = ViolationRecordDB(
            id=record.id,
            violation_type=record.violation_type.value,
            confidence=record.confidence,
            confidence_tier=record.confidence_tier.value,
            bbox=record.bbox.model_dump(),
            person_bbox=record.person_bbox.model_dump() if record.person_bbox else None,
            metadata=raw_violation.get("metadata", {}),
            mv_act_section=record.mv_act_section,
            fine_amount=record.fine_amount,
            license_plate_text=plate_text,
            license_plate_confidence=plate_conf,
            license_plate_bbox=plate_bbox,
            status=ViolationStatusDB.PENDING.value,
            data_source="live",
            camera_id=camera_id,
            timestamp=record.timestamp,
            evidence_url=record.evidence_url,
            evidence_hash=record.evidence_hash,
        )
        db.add(db_record)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to save violation to DB: %s", e)
    finally:
        db.close()
