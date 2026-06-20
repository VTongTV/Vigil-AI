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

from backend.app.config import get_camera_info, get_preprocessing_config, get_violation_config, settings
from backend.app.core.evidence import (
    VIOLATION_INFO,
    generate_evidence_image,
    get_evidence_url,
    save_evidence_image,
)
from backend.app.core.ocr import process_plates
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import (
    compute_danger_score,
    detect_all_violations,
    extract_windshield_crops,
    generate_ai_explanation,
)
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
    DetectionSummary,
    ImageDimensions,
    LicensePlateResult,
    PreprocessingApplied,
    PreprocessingStep,
    TimingBreakdown,
    ViolationRecord,
    ViolationStatus,
    ViolationType,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# COCO class ID → DetectionSummary field mapping
_COCO_CLASS_MAP: dict[int, str] = {
    0: "persons",    # person
    1: "bicycles",   # bicycle
    2: "cars",       # car
    3: "motorcycles", # motorcycle
    5: "buses",      # bus
    7: "trucks",     # truck
}

# Categories considered "vehicles" for vehicle_categories list
_VEHICLE_CLASS_IDS = {2, 3, 5, 7}
_VEHICLE_NAMES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Categories considered "riders" (person on a motorized 2-wheeler)
_RIDER_VEHICLE_IDS = {3}  # motorcycle → implies rider


def _build_detection_summary(coco_dets: list[dict]) -> DetectionSummary:
    """Build DetectionSummary from COCO detection results.

    Counts objects by category, distinguishes riders from pedestrians,
    and lists unique vehicle categories detected.

    Args:
        coco_dets: List of COCO detection dicts with class_id, class_name, confidence.

    Returns:
        DetectionSummary with counts per category.
    """
    counts: dict[str, int] = {
        "persons": 0,
        "riders": 0,
        "pedestrians": 0,
        "cars": 0,
        "motorcycles": 0,
        "buses": 0,
        "trucks": 0,
        "bicycles": 0,
    }
    vehicle_cats: set[str] = set()
    motorcycle_count = 0

    for det in coco_dets:
        cls_id = det.get("class_id")
        if cls_id is None:
            continue

        field = _COCO_CLASS_MAP.get(cls_id)
        if field and field in counts:
            counts[field] += 1

        if cls_id in _VEHICLE_CLASS_IDS:
            vehicle_cats.add(_VEHICLE_NAMES[cls_id])

        if cls_id == 3:
            motorcycle_count += 1

    # Riders = persons detected near motorcycles (approximation: count = min(persons, motorcycles))
    # For simplicity, each motorcycle implies one rider
    counts["riders"] = motorcycle_count

    # Pedestrians = persons not associated with vehicles (total persons minus riders)
    counts["pedestrians"] = max(0, counts["persons"] - counts["riders"])

    total = sum(counts.values())

    return DetectionSummary(
        persons=counts["persons"],
        riders=counts["riders"],
        pedestrians=counts["pedestrians"],
        cars=counts["cars"],
        motorcycles=counts["motorcycles"],
        buses=counts["buses"],
        trucks=counts["trucks"],
        bicycles=counts["bicycles"],
        total_objects=total,
        vehicle_categories=sorted(vehicle_cats),
    )


def _build_preprocessing_applied(
    image: np.ndarray,
    config: Optional[dict] = None,
) -> PreprocessingApplied:
    """Build PreprocessingApplied from image metrics and config.

    Computes brightness/contrast from the image, determines which
    preprocessing steps would be active, and flags challenging conditions.

    Args:
        image: Original BGR image before preprocessing.
        config: Preprocessing config dict. If None, loaded from default.yaml.

    Returns:
        PreprocessingApplied with step details and condition flags.
    """
    if config is None:
        config = get_preprocessing_config()

    # Compute image metrics
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray)) / 255.0  # Normalized 0-1
    contrast = float(np.std(gray)) / 255.0     # Normalized ~0-0.5

    # Build steps from config
    steps: list[PreprocessingStep] = []
    condition_flags: list[str] = []

    clahe_cfg = config.get("clahe", {})
    steps.append(PreprocessingStep(
        name="CLAHE",
        enabled=clahe_cfg.get("enabled", True),
        parameters={
            "clip_limit": clahe_cfg.get("clip_limit", 2.0),
            "tile_grid_size": clahe_cfg.get("tile_grid_size", [8, 8]),
        },
    ))

    denoise_cfg = config.get("denoise", {})
    steps.append(PreprocessingStep(
        name="Denoise",
        enabled=denoise_cfg.get("enabled", True),
        parameters={
            "h": denoise_cfg.get("h", 10),
            "template_window_size": denoise_cfg.get("template_window_size", 7),
            "search_window_size": denoise_cfg.get("search_window_size", 21),
        },
    ))

    gamma_cfg = config.get("gamma", {})
    steps.append(PreprocessingStep(
        name="Gamma Correction",
        enabled=gamma_cfg.get("enabled", True),
        parameters={"gamma": gamma_cfg.get("value", 1.2)},
    ))

    # Detect challenging conditions
    if brightness < 0.3:
        condition_flags.append("low_light")
    if brightness > 0.8:
        condition_flags.append("overexposed")
    if contrast < 0.1:
        condition_flags.append("low_contrast")
    if contrast > 0.4:
        condition_flags.append("high_contrast")

    return PreprocessingApplied(
        steps=steps,
        image_brightness=round(brightness, 3),
        image_contrast=round(contrast, 3),
        condition_flags=condition_flags,
    )


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
    preprocessing_config = get_preprocessing_config()
    preprocessed = preprocess_image(img_bgr, preprocessing_config)
    preprocess_ms = int((time.time() - t0) * 1000)

    # Build preprocessing metadata (from original image)
    preprocessing_applied = _build_preprocessing_applied(img_bgr, preprocessing_config)

    # Step 2: COCO detection (resident)
    t0 = time.time()
    mm = request.app.state.model_manager
    if mm is None or not mm.is_ready():
        raise HTTPException(status_code=503, detail="Models not loaded")
    coco_dets = mm.detect_coco(preprocessed)
    detect_coco_ms = int((time.time() - t0) * 1000)

    # Build detection summary from COCO detections
    detection_summary = _build_detection_summary(coco_dets)

    # Step 3: Helmet detection (resident)
    t0 = time.time()
    helmet_dets = mm.detect_helmet(preprocessed)
    detect_helmet_ms = int((time.time() - t0) * 1000)

    # Step 3b: Seatbelt classification (on-demand, only if cars present)
    # NOTE: Seatbelt timing is folded into violation_logic_ms below
    seatbelt_classifications: list[dict] = []
    car_dets = [d for d in coco_dets if d.get("class_id") == 2]  # COCO car class
    if car_dets:
        windshield_crops = extract_windshield_crops(
            car_dets, preprocessed, img_w, img_h,
        )
        if windshield_crops:
            raw_classifications = mm.classify_seatbelt_on_demand(
                [c["crop"] for c in windshield_crops],
            )
            for crop_info, cls_result in zip(windshield_crops, raw_classifications):
                seatbelt_classifications.append({
                    "class_name": cls_result["class_name"],
                    "confidence": cls_result["confidence"],
                    "car_bbox": crop_info["car_bbox"],
                    "crop_bbox": crop_info["crop_bbox"],
                    "crop_index": crop_info["crop_index"],
                    "car_confidence": crop_info["car_confidence"],
                })

    # Step 4: Violation logic (includes seatbelt classification timing)
    t0 = time.time()
    # Get configured polygons from violation configs
    wrong_side_cfg = get_violation_config("wrong_side")
    parking_cfg = get_violation_config("illegal_parking")
    stop_line_cfg = get_violation_config("stop_line")
    red_light_cfg = get_violation_config("red_light")

    camera_id_str = camera_id or "unknown"

    # Filter polygons by camera_id (if specified in config, otherwise apply globally)
    def filter_polygons(polygons: list) -> list:
        return [p for p in polygons if p.get("camera_id", camera_id_str) == camera_id_str]

    violations = detect_all_violations(
        coco_detections=coco_dets,
        helmet_detections=helmet_dets,
        img_w=img_w,
        img_h=img_h,
        lane_polygons=filter_polygons(wrong_side_cfg.get("lane_polygons", [])),
        no_parking_zones=filter_polygons(parking_cfg.get("zone_polygons", [])),
        stop_line_zones=filter_polygons(stop_line_cfg.get("stop_line_zones", [])),
        signal_state=red_light_cfg.get("signal_state", "unknown"),
        seatbelt_detections=seatbelt_classifications,
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
    camera_info = get_camera_info(camera_id) if camera_id else {}

    for i, v in enumerate(violations):
        v_type = v["type"]
        info = VIOLATION_INFO.get(v_type, {"section": "177", "amount": 200})
        fine_info = FINE_SCHEDULE.get(v_type, {"section": "177", "amount": 200})
        conf = v["confidence"]
        tier = get_confidence_tier(conf)
        v_meta = v.get("metadata", {})

        # Compute danger score (F3)
        compound_factor = 1.5 if len(violations) > 1 else 1.0
        danger_score = compute_danger_score(
            violation_type=v_type,
            confidence=conf,
            fine_amount=int(fine_info["amount"]),
            compound_factor=compound_factor,
        )

        # Generate AI explanation (F4)
        ai_explanation = generate_ai_explanation(
            violation_type=v_type,
            confidence=conf,
            bbox=v["bbox"],
            metadata=v_meta,
        )

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
            metadata=v_meta,
            mv_act_section=str(fine_info["section"]),
            fine_amount=int(fine_info["amount"]),
            license_plate=plate_result,
            status=ViolationStatus.PENDING,
            data_source=DataSource.LIVE,
            camera_id=camera_id,
            junction_name=camera_info.get("junction_name"),
            latitude=camera_info.get("latitude"),
            longitude=camera_info.get("longitude"),
            timestamp=now,
            evidence_url=evidence_url,
            evidence_hash=evidence_hash,
            danger_score=danger_score,
            ai_explanation=ai_explanation,
        )
        violation_records.append(record)

        # Persist to database
        _save_violation_to_db(record, v, plate_results, camera_id)

    # Smart Deduplication (F7): Mark duplicates by (camera_id, plate, type) within 5-min window
    _mark_duplicates(violation_records, camera_id)

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
        detection_summary=detection_summary,
        preprocessing_applied=preprocessing_applied,
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
            violation_metadata=raw_violation.get("metadata", {}),
            mv_act_section=record.mv_act_section,
            fine_amount=record.fine_amount,
            license_plate_text=plate_text,
            license_plate_confidence=plate_conf,
            license_plate_bbox=plate_bbox,
            status=ViolationStatusDB.PENDING.value,
            data_source="live",
            camera_id=camera_id,
            junction_name=record.junction_name,
            latitude=record.latitude,
            longitude=record.longitude,
            timestamp=record.timestamp,
            evidence_url=record.evidence_url,
            evidence_hash=record.evidence_hash,
            danger_score=record.danger_score,
            ai_explanation=record.ai_explanation,
            is_duplicate=1 if record.is_duplicate else 0,
            duplicate_group_id=record.duplicate_group_id,
        )
        db.add(db_record)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to save violation to DB: %s", e)
    finally:
        db.close()


def _mark_duplicates(
    violation_records: list[ViolationRecord],
    camera_id: Optional[str],
) -> None:
    """Mark duplicate violations based on (camera_id, plate, type) grouping.

    Groups violations by (camera_id, license_plate.text, violation_type).
    First occurrence in each group is the original; subsequent ones are
    marked as duplicates with a shared duplicate_group_id.

    Also queries the DB for recent (5-minute window) violations to detect
    cross-request duplicates.

    Args:
        violation_records: List of ViolationRecord to deduplicate.
        camera_id: Camera identifier for the current detection.
    """
    from datetime import timedelta

    # Group current violations by (camera_id, plate_text, violation_type)
    group_key_counts: dict[str, int] = {}
    plate_text = None

    # First pass: determine groups within current batch
    for record in violation_records:
        plate_text = record.license_plate.text if record.license_plate else ""
        key = f"{camera_id or 'none'}:{plate_text}:{record.violation_type.value}"

        if key not in group_key_counts:
            group_key_counts[key] = 0
            record.is_duplicate = False
            record.duplicate_group_id = None
        else:
            group_key_counts[key] += 1
            record.is_duplicate = True
            record.duplicate_group_id = f"dup_{key}"

        # Also set the group_id on the first occurrence if there are subsequent ones
        if group_key_counts[key] > 0:
            for prev_record in violation_records:
                prev_plate = prev_record.license_plate.text if prev_record.license_plate else ""
                prev_key = f"{prev_record.camera_id or 'none'}:{prev_plate}:{prev_record.violation_type.value}"
                if prev_key == key and not prev_record.is_duplicate:
                    prev_record.duplicate_group_id = f"dup_{key}"
                    break

    # Second pass: check DB for recent duplicates within 5-minute window
    db = SessionLocal()
    try:
        five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        for record in violation_records:
            if record.is_duplicate:
                continue  # Already marked as duplicate within batch

            plate_text = record.license_plate.text if record.license_plate else ""
            if not plate_text and not camera_id:
                continue  # No meaningful grouping possible

            # Query DB for matching violations in last 5 minutes
            existing = (
                db.query(ViolationRecordDB)
                .filter(
                    ViolationRecordDB.violation_type == record.violation_type.value,
                    ViolationRecordDB.camera_id == camera_id,
                    ViolationRecordDB.license_plate_text == plate_text,
                    ViolationRecordDB.timestamp >= five_min_ago,
                    ViolationRecordDB.id != record.id,
                )
                .first()
            )

            if existing:
                record.is_duplicate = True
                group_id = existing.duplicate_group_id or f"dup_{existing.id}"
                record.duplicate_group_id = group_id
                if not existing.duplicate_group_id:
                    existing.duplicate_group_id = group_id
                    existing.is_duplicate = 1
                    db.commit()
    except Exception as e:
        logger.error("Failed to check DB duplicates: %s", e)
    finally:
        db.close()
