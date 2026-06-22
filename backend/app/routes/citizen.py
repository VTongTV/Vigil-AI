"""POST /api/v1/citizen/detect — Citizen-facing violation detection.

Reuses the full detection pipeline but returns a redacted response
that omits sensitive fields (plate text, fine amount, MV Act section,
evidence hash, danger score) to keep citizen-facing data appropriate.
"""

import logging
import time
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from backend.app.config import get_preprocessing_config, settings
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import detect_all_violations
from backend.app.schemas import (
    CitizenDetectResponse,
    DetectionSummary,
    ImageDimensions,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# COCO class ID → DetectionSummary field mapping
_COCO_CLASS_MAP: dict[int, str] = {
    0: "persons",
    1: "bicycles",
    2: "cars",
    3: "motorcycles",
    5: "buses",
    7: "trucks",
}
_VEHICLE_CLASS_IDS = {2, 3, 5, 7}
_VEHICLE_NAMES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def _build_detection_summary(coco_dets: list[dict]) -> DetectionSummary:
    """Build DetectionSummary from COCO detection results.

    Counts objects by category, distinguishes riders from pedestrians,
    and lists unique vehicle categories detected.

    Args:
        coco_dets: List of COCO detection dicts with class_id, class_name,
            confidence.

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

    counts["riders"] = motorcycle_count
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


@router.post("/citizen/detect", response_model=CitizenDetectResponse)
async def citizen_detect_violations(
    request: Request,
    image: UploadFile = File(...),
    camera_id: Optional[str] = Form(None),
):
    """Upload a traffic camera image and detect violations (citizen view).

    Returns a redacted response without sensitive fields like plate text,
    fine amounts, or evidence hashes. Designed for public-facing usage
    where privacy and data minimisation are required.

    Args:
        request: FastAPI request with app state model_manager.
        image: JPEG/PNG image file (max 10MB).
        camera_id: Optional camera identifier for location context.

    Returns:
        Redacted detection results appropriate for citizen consumption.

    Raises:
        HTTPException: 400 for invalid input, 503 if models are not loaded.
    """
    start_time = time.time()

    # Validate content type
    if not image.content_type or image.content_type not in (
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
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

    # Preprocessing
    preprocessing_config = get_preprocessing_config()
    preprocessed = preprocess_image(img_bgr, preprocessing_config)

    # COCO + Helmet detection via resident models
    mm = request.app.state.model_manager
    if mm is None or not mm.is_ready():
        raise HTTPException(status_code=503, detail="Models not loaded")

    coco_dets = mm.detect_coco(preprocessed)
    helmet_dets = mm.detect_helmet(preprocessed)

    # Violation logic — simplified for citizen view (no polygon zones needed)
    violations = detect_all_violations(
        coco_detections=coco_dets,
        helmet_detections=helmet_dets,
        img_w=img_w,
        img_h=img_h,
        lane_polygons=[],
        no_parking_zones=[],
        stop_line_zones=[],
        signal_state="unknown",
        seatbelt_detections=[],
    )

    detection_summary = _build_detection_summary(coco_dets)

    total_ms = int((time.time() - start_time) * 1000)

    # Return redacted response — no plate text, fines, evidence hashes
    violation_types = list({v["type"] for v in violations})

    return CitizenDetectResponse(
        success=True,
        processing_time_ms=total_ms,
        violations_found=len(violations),
        violation_types=violation_types,
        image_dimensions=ImageDimensions(width=img_w, height=img_h),
        detection_summary=detection_summary,
        message="Your report has been processed. Thank you for helping keep Bengaluru's roads safe.",
    )
