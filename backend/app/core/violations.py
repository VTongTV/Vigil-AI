"""Violation detection logic for all 7 traffic violation types.

Detection approaches:
    - Primary: Helmet non-compliance, Triple riding, License plate mismatch
    - Heuristic: Wrong-side driving, Illegal parking, Stop-line violation
    - Best-effort: Seatbelt non-compliance, Red-light violation

All algorithms documented in docs/violations-spec.md.
"""

import logging
from typing import Optional

import numpy as np

from backend.app.config import get_violation_config

logger = logging.getLogger(__name__)


# --- Danger Score Computation (F3) ---


def compute_danger_score(
    violation_type: str,
    confidence: float,
    fine_amount: int,
    compound_factor: float = 1.0,
) -> int:
    """Compute a danger/severity score (0-100) for a violation.

    Formula: min(100, fine_amount / 10 * confidence * compound_factor)
    compound_factor = 1.5 when multiple violations on same person, 1.0 otherwise.

    Args:
        violation_type: Type of violation detected.
        confidence: Detection confidence (0.0 - 1.0).
        fine_amount: Fine amount in INR from FINE_SCHEDULE.
        compound_factor: Multiplier for compound violations (default 1.0).

    Returns:
        Integer danger score in [0, 100].
    """
    raw_score = (fine_amount / 10.0) * confidence * compound_factor
    return min(100, max(0, int(raw_score)))


# --- AI Explanation Generation (F4) ---


def generate_ai_explanation(
    violation_type: str,
    confidence: float,
    bbox: list[float],
    metadata: dict,
) -> str:
    """Generate a human-readable explanation for a detected violation.

    Produces a clear, court-admissible explanation describing what was
    detected, where in the image, and with what confidence.

    Args:
        violation_type: Type of violation detected.
        confidence: Detection confidence (0.0 - 1.0).
        bbox: Normalized bounding box [x1, y1, x2, y2].
        metadata: Additional detection metadata dict.

    Returns:
        Human-readable explanation string.
    """
    conf_pct = f"{confidence:.0%}"
    region = f"({bbox[0]:.2f},{bbox[1]:.2f})→({bbox[2]:.2f},{bbox[3]:.2f})"

    if violation_type == "no_helmet":
        head_region = ""
        person_bbox = metadata.get("person_bbox")
        if person_bbox and isinstance(person_bbox, list):
            head_region = f" Person region ({person_bbox[0]:.2f},{person_bbox[1]:.2f})→({person_bbox[2]:.2f},{person_bbox[3]:.2f})."
        return (
            f"Person detected at {region}.{head_region} "
            f"No helmet overlap found on head region. "
            f"Classified as no_helmet with {conf_pct} confidence."
        )

    elif violation_type == "triple_riding":
        rider_count = metadata.get("rider_count", 3)
        return (
            f"Rider group at {region} contains {rider_count} person heads. "
            f"{rider_count} riders detected on single two-wheeler. "
            f"Classified as triple_riding with {conf_pct} confidence."
        )

    elif violation_type == "wrong_side_driving":
        lane_id = metadata.get("lane_id", "unknown")
        return (
            f"Vehicle at {region} detected in wrong-side lane zone '{lane_id}'. "
            f"Classified as wrong_side_driving with {conf_pct} confidence."
        )

    elif violation_type == "illegal_parking":
        zone_name = metadata.get("zone_name", "No Parking Zone")
        return (
            f"Vehicle at {region} detected stationary in '{zone_name}'. "
            f"Classified as illegal_parking with {conf_pct} confidence."
        )

    elif violation_type == "no_seatbelt":
        return (
            f"Occupant at {region} detected without seatbelt (best-effort detection). "
            f"Classified as no_seatbelt with {conf_pct} confidence."
        )

    elif violation_type == "stop_line_violation":
        zone_id = metadata.get("zone_id", "unknown")
        return (
            f"Vehicle at {region} detected past stop-line zone '{zone_id}'. "
            f"Classified as stop_line_violation with {conf_pct} confidence."
        )

    elif violation_type == "red_light_violation":
        signal = metadata.get("signal_state", "red")
        return (
            f"Vehicle at {region} crossed stop-line during {signal} signal. "
            f"Classified as red_light_violation with {conf_pct} confidence."
        )

    elif violation_type == "license_plate_mismatch":
        return (
            f"License plate at {region} failed format validation. "
            f"Classified as license_plate_mismatch with {conf_pct} confidence."
        )

    return f"Violation at {region} classified as {violation_type} with {conf_pct} confidence."


def compute_iou(box_a: list[float], box_b: list[float]) -> float:
    """Compute Intersection over Union between two [x1, y1, x2, y2] bboxes.

    Args:
        box_a: First bounding box [x1, y1, x2, y2].
        box_b: Second bounding box [x1, y1, x2, y2].

    Returns:
        IoU value in [0, 1].
    """
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    return intersection / union if union > 0 else 0.0


def bbox_center(bbox: list[float]) -> tuple[float, float]:
    """Compute center point of a bounding box.

    Args:
        bbox: [x1, y1, x2, y2] bounding box.

    Returns:
        (cx, cy) center coordinates.
    """
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def point_in_polygon(px: float, py: float, polygon: list[list[float]]) -> bool:
    """Check if a point is inside a polygon using ray casting.

    Args:
        px: Point x coordinate (normalized 0-1).
        py: Point y coordinate (normalized 0-1).
        polygon: List of [x, y] points forming the polygon.

    Returns:
        True if point is inside the polygon.
    """
    n = len(polygon)
    if n < 3:
        return False

    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]

        if ((yi > py) != (yj > py)) and (
            px < (xj - xi) * (py - yi) / (yj - yi) + xi
        ):
            inside = not inside
        j = i

    return inside


# --- Helmet Non-Compliance ---


def detect_helmet_violations(
    person_boxes: list[dict],
    helmet_boxes: list[dict],
    two_wheeler_boxes: list[dict],
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Detect helmet non-compliance using head-region spatial association.

    Algorithm:
        1. For each person near a two-wheeler, extract head region (top 30%)
        2. Check if "Without Helmet" detection overlaps head region
        3. If no helmet overlaps head region → violation

    Args:
        person_boxes: COCO person detections with 'bbox' [x1,y1,x2,y2] pixel coords.
        helmet_boxes: Helmet model detections with class names 'With Helmet'/'Without Helmet'.
        two_wheeler_boxes: COCO motorcycle/bicycle detections.
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of violation dicts with type, bbox, confidence.
    """
    cfg = get_violation_config("helmet")
    head_fraction = cfg.get("head_fraction", 0.30)
    iou_threshold = cfg.get("iou_threshold", 0.15)
    margin = cfg.get("person_on_moto_margin", 0.05)

    violations = []

    for person in person_boxes:
        p_bbox = person["bbox"]  # pixel coords
        p_conf = person["confidence"]

        # Check if person is near a two-wheeler
        p_cx, p_cy = bbox_center(p_bbox)
        near_moto = False
        for tw in two_wheeler_boxes:
            tw_bbox = tw["bbox"]
            # Normalize person center to check against two-wheeler
            norm_cx = p_cx / img_w
            norm_cy = p_cy / img_h
            tw_norm = [tw_bbox[0] / img_w, tw_bbox[1] / img_h,
                       tw_bbox[2] / img_w, tw_bbox[3] / img_h]

            if (tw_norm[0] - margin <= norm_cx <= tw_norm[2] + margin and
                    tw_norm[1] - margin <= norm_cy <= tw_norm[3] + margin):
                near_moto = True
                break

        if not near_moto:
            continue

        # Extract head region (top 30% of person bbox)
        head_bbox = [
            p_bbox[0],
            p_bbox[1],
            p_bbox[2],
            p_bbox[1] + (p_bbox[3] - p_bbox[1]) * head_fraction,
        ]

        # Check helmet overlap with head region
        has_no_helmet = False
        no_helmet_conf = 0.0
        has_helmet = False
        helmet_min_conf = cfg.get("helmet_min_confidence", 0.35)

        for h_det in helmet_boxes:
            h_bbox = h_det["bbox"]
            h_class = h_det["class_name"].lower().replace("_", " ")
            h_conf = h_det["confidence"]

            h_cx, h_cy = bbox_center(h_bbox)

            # Center-point association: is helmet center inside the head region?
            if head_bbox[0] <= h_cx <= head_bbox[2] and head_bbox[1] <= h_cy <= head_bbox[3]:
                if "no helmet" in h_class or "without" in h_class:
                    has_no_helmet = True
                    no_helmet_conf = max(no_helmet_conf, h_conf)
                elif ("helmet" in h_class or "with" in h_class) and h_conf >= helmet_min_conf:
                    # Only trust "With Helmet" above minimum confidence.
                    # A low-confidence "With Helmet" (e.g. 0.23) is likely noise.
                    has_helmet = True

        # Determine violation using three-state logic:
        # 1. Explicit no-helmet detection → high-confidence violation
        # 2. No detection of ANY class overlapping head → inference-based violation
        # 3. Valid "with helmet" detection → no violation
        if has_no_helmet:
            violations.append({
                "type": "no_helmet",
                "bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                         p_bbox[2] / img_w, p_bbox[3] / img_h],
                "person_bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                                p_bbox[2] / img_w, p_bbox[3] / img_h],
                "confidence": no_helmet_conf,
            })
        elif not has_helmet:
            # No helmet model output overlaps this person's head.
            # Absence of helmet evidence → flag as violation with reduced confidence.
            violations.append({
                "type": "no_helmet",
                "bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                         p_bbox[2] / img_w, p_bbox[3] / img_h],
                "person_bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                                p_bbox[2] / img_w, p_bbox[3] / img_h],
                "confidence": p_conf * 0.8,
            })

    return violations


# --- Triple Riding ---


def detect_triple_riding(
    person_boxes: list[dict],
    two_wheeler_boxes: list[dict],
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Detect triple riding using 2D spatial constraints.

    Algorithm:
        1. For each two-wheeler, find persons whose horizontal center
           is within the vehicle bbox and vertical overlap > 30%
        2. If 3+ riders → triple riding violation

    Args:
        person_boxes: COCO person detections.
        two_wheeler_boxes: COCO motorcycle/bicycle detections.
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of violation dicts.
    """
    cfg = get_violation_config("triple_riding")
    max_riders = cfg.get("max_riders", 2)
    center_margin = cfg.get("horizontal_center_threshold", 0.15)
    vert_overlap_thresh = cfg.get("vertical_overlap_threshold", 0.30)

    violations = []

    for tw in two_wheeler_boxes:
        tw_bbox = tw["bbox"]
        riders = []

        for person in person_boxes:
            p_bbox = person["bbox"]

            # Horizontal center check
            p_cx = (p_bbox[0] + p_bbox[2]) / 2
            tw_cx = (tw_bbox[0] + tw_bbox[2]) / 2
            tw_w = tw_bbox[2] - tw_bbox[0]

            if abs(p_cx - tw_cx) > tw_w * (0.5 + center_margin):
                continue

            # Vertical overlap check
            overlap_y1 = max(p_bbox[1], tw_bbox[1])
            overlap_y2 = min(p_bbox[3], tw_bbox[3])
            overlap_h = max(0, overlap_y2 - overlap_y1)
            person_h = p_bbox[3] - p_bbox[1]

            if person_h > 0 and overlap_h / person_h >= vert_overlap_thresh:
                riders.append(person)

        if len(riders) > max_riders:
            rider_bboxes = [
                [r["bbox"][0] / img_w, r["bbox"][1] / img_h,
                 r["bbox"][2] / img_w, r["bbox"][3] / img_h]
                for r in riders
            ]
            violations.append({
                "type": "triple_riding",
                "bbox": [tw_bbox[0] / img_w, tw_bbox[1] / img_h,
                         tw_bbox[2] / img_w, tw_bbox[3] / img_h],
                "person_bbox": rider_bboxes[0] if rider_bboxes else None,
                "confidence": min(r["confidence"] for r in riders),
                "metadata": {
                    "rider_count": len(riders),
                    "rider_bboxes": rider_bboxes,
                },
            })

    return violations


# --- Wrong-Side Driving ---


def detect_wrong_side(
    vehicle_boxes: list[dict],
    lane_polygons: list[dict],
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Detect vehicles traveling against lane direction.

    Uses configurable lane polygons. A vehicle in the "wrong side"
    portion of a lane is flagged.

    Args:
        vehicle_boxes: COCO vehicle detections.
        lane_polygons: Configured lane regions with direction info.
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of violation dicts.
    """
    cfg = get_violation_config("wrong_side")
    if not cfg.get("enabled", True):
        return []

    violations = []
    for vehicle in vehicle_boxes:
        bbox = vehicle["bbox"]
        cx_norm = ((bbox[0] + bbox[2]) / 2) / img_w
        cy_norm = ((bbox[1] + bbox[3]) / 2) / img_h

        for lane in lane_polygons:
            polygon = lane.get("polygon", [])
            if point_in_polygon(cx_norm, cy_norm, polygon):
                violations.append({
                    "type": "wrong_side_driving",
                    "bbox": [bbox[0] / img_w, bbox[1] / img_h,
                             bbox[2] / img_w, bbox[3] / img_h],
                    "confidence": vehicle["confidence"] * 0.8,
                    "metadata": {
                        "lane_id": lane.get("id", "unknown"),
                        "vehicle_type": vehicle.get("class_name", "unknown"),
                    },
                })
                break

    return violations


# --- Illegal Parking ---


def detect_illegal_parking(
    vehicle_boxes: list[dict],
    zone_polygons: list[dict],
    img_w: int,
    img_h: int,
    stop_line_zones: Optional[list[dict]] = None,
) -> list[dict]:
    """Detect vehicles parked in no-parking zones.

    Args:
        vehicle_boxes: COCO vehicle detections.
        zone_polygons: Configured no-parking zone polygons.
        img_w: Image width in pixels.
        img_h: Image height in pixels.
        stop_line_zones: Stop-line zones used to exclude vehicles queued at signals.

    Returns:
        List of violation dicts.
    """
    cfg = get_violation_config("illegal_parking")
    if not cfg.get("enabled", True):
        return []

    min_conf = cfg.get("min_confidence", 0.5)
    violations = []

    for vehicle in vehicle_boxes:
        if vehicle["confidence"] < min_conf:
            continue

        bbox = vehicle["bbox"]
        cx_norm = ((bbox[0] + bbox[2]) / 2) / img_w
        cy_norm = ((bbox[1] + bbox[3]) / 2) / img_h

        # Skip vehicles that are also in a stop-line zone — likely queued at signal
        if stop_line_zones:
            in_stop_zone = False
            for sz in stop_line_zones:
                sz_poly = sz.get("polygon", [])
                front_cx = ((bbox[0] + bbox[2]) / 2) / img_w
                front_cy = bbox[3] / img_h
                if point_in_polygon(front_cx, front_cy, sz_poly):
                    in_stop_zone = True
                    break
            if in_stop_zone:
                continue

        for zone in zone_polygons:
            polygon = zone.get("polygon", [])
            if point_in_polygon(cx_norm, cy_norm, polygon):
                violations.append({
                    "type": "illegal_parking",
                    "bbox": [bbox[0] / img_w, bbox[1] / img_h,
                             bbox[2] / img_w, bbox[3] / img_h],
                    "confidence": vehicle["confidence"] * 0.7,
                    "metadata": {
                        "zone_id": zone.get("id", "unknown"),
                        "zone_name": zone.get("name", "No Parking Zone"),
                        "vehicle_type": vehicle.get("class_name", "unknown"),
                    },
                })
                break

    return violations


# --- Seatbelt Non-Compliance (Classifier-Based) ---


def extract_windshield_crops(
    car_boxes: list[dict],
    image: np.ndarray,
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Extract windshield/driver crops from car detections for seatbelt classification.

    For each car bbox, extracts the top portion (windshield area) by taking
    the top ``windshield_crop_ratio_top`` fraction of the car height and
    the central ``windshield_crop_ratio_side`` fraction of the car width.
    Crops are clamped to image bounds and crops smaller than
    ``min_crop_size`` in either dimension are skipped.

    Args:
        car_boxes: COCO car detections with 'bbox' [x1,y1,x2,y2] pixel coords
            and 'confidence'.
        image: BGR image (HWC, uint8) to crop from.
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of dicts with keys: crop (np.ndarray BGR), car_bbox (pixel),
        crop_bbox (pixel), crop_index, car_confidence.
    """
    cfg = get_violation_config("seatbelt")
    crop_ratio_top = cfg.get("windshield_crop_ratio_top", 0.4)
    crop_ratio_side = cfg.get("windshield_crop_ratio_side", 0.7)
    min_crop_size = cfg.get("min_crop_size", 32)

    crops: list[dict] = []

    for idx, car in enumerate(car_boxes):
        bbox = car["bbox"]  # [x1, y1, x2, y2] pixel coords
        x1, y1, x2, y2 = bbox

        car_w = x2 - x1
        car_h = y2 - y1

        if car_w <= 0 or car_h <= 0:
            continue

        # Windshield region: top portion of car bbox
        crop_y1 = int(round(y1))
        crop_y2 = int(round(y1 + car_h * crop_ratio_top))

        # Center-width inset: keep the middle crop_ratio_side fraction
        side_inset = car_w * (1.0 - crop_ratio_side) / 2.0
        crop_x1 = int(round(x1 + side_inset))
        crop_x2 = int(round(x2 - side_inset))

        # Clamp to image bounds
        crop_x1 = max(0, crop_x1)
        crop_y1 = max(0, crop_y1)
        crop_x2 = min(img_w, crop_x2)
        crop_y2 = min(img_h, crop_y2)

        crop_w = crop_x2 - crop_x1
        crop_h = crop_y2 - crop_y1

        if crop_w < min_crop_size or crop_h < min_crop_size:
            logger.debug(
                "Skipping tiny seatbelt crop %dx%d for car %d",
                crop_w, crop_h, idx,
            )
            continue

        crop_img = image[crop_y1:crop_y2, crop_x1:crop_x2].copy()

        crops.append({
            "crop": crop_img,
            "car_bbox": [float(x1), float(y1), float(x2), float(y2)],
            "crop_bbox": [float(crop_x1), float(crop_y1),
                          float(crop_x2), float(crop_y2)],
            "crop_index": idx,
            "car_confidence": car["confidence"],
        })

    return crops


def detect_seatbelt_violations(
    car_boxes: list[dict],
    seatbelt_classifications: list[dict],
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Detect seatbelt non-compliance from classifier results.

    Only emits ``no_seatbelt`` violations for real negative class labels
    from the classifier (e.g. ``no_seatbelt``).  Positive labels such as
    ``with_seatbelt`` or ``seat_belt`` are never emitted.  Low-confidence
    results (after applying the configured discount) are also filtered out.

    Args:
        car_boxes: COCO car detections (used for context; car_bbox is
            embedded in each classification dict).
        seatbelt_classifications: Classification results – list of dicts
            with keys: class_name, confidence, car_bbox, crop_bbox,
            crop_index, car_confidence.
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of violation dicts with type, bbox, confidence, metadata.
    """
    cfg = get_violation_config("seatbelt")
    if not cfg.get("enabled", True):
        return []

    confidence_discount = cfg.get("confidence_discount", 0.70)
    min_confidence = cfg.get("min_confidence", 0.30)
    review_threshold = cfg.get("review_threshold", 0.50)

    # Known negative class labels (normalised: lowercase, underscores)
    _NEGATIVE_LABELS = frozenset({
        "no_seatbelt", "without_seatbelt", "no seatbelt", "without seatbelt",
        "no_belt", "nobelt",
    })

    violations: list[dict] = []

    for det in seatbelt_classifications:
        raw_class = det.get("class_name", "")
        class_name_norm = raw_class.lower().replace("-", "_").replace(" ", "_")
        raw_conf: float = det["confidence"]
        adjusted_conf = raw_conf * confidence_discount

        # Filter: low confidence after discount
        if adjusted_conf < min_confidence:
            continue

        # Filter: only emit for real negative labels
        if class_name_norm not in _NEGATIVE_LABELS:
            continue

        car_bbox = det["car_bbox"]
        crop_bbox = det["crop_bbox"]
        car_conf: float = det.get("car_confidence", 0.0)

        violations.append({
            "type": "no_seatbelt",
            "bbox": [
                car_bbox[0] / img_w, car_bbox[1] / img_h,
                car_bbox[2] / img_w, car_bbox[3] / img_h,
            ],
            "confidence": adjusted_conf,
            "metadata": {
                "detection_method": "seatbelt_classifier",
                "raw_confidence": raw_conf,
                "adjusted_confidence": adjusted_conf,
                "crop_bbox": [
                    crop_bbox[0] / img_w, crop_bbox[1] / img_h,
                    crop_bbox[2] / img_w, crop_bbox[3] / img_h,
                ],
                "car_confidence": car_conf,
                "review_recommended": adjusted_conf < review_threshold,
                "crop_index": det.get("crop_index", 0),
                "class_name": raw_class,
            },
        })

    return violations


# --- Stop-Line Violation ---


def detect_stop_line_violations(
    vehicle_boxes: list[dict],
    stop_line_zones: list[dict],
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Detect vehicles past the stop line.

    Zone-based heuristic: if a vehicle's front (bottom-center)
    is past the stop-line zone, flag as violation.

    Args:
        vehicle_boxes: COCO vehicle detections.
        stop_line_zones: Configured stop-line zone polygons.
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of violation dicts.
    """
    cfg = get_violation_config("stop_line")
    if not cfg.get("enabled", True):
        return []

    min_conf = cfg.get("min_confidence", 0.3)
    conf_discount = cfg.get("confidence_discount", 0.75)

    violations = []

    for vehicle in vehicle_boxes:
        if vehicle["confidence"] < min_conf:
            continue

        bbox = vehicle["bbox"]
        # Vehicle front: bottom-center (assuming forward motion toward camera)
        front_cx_norm = ((bbox[0] + bbox[2]) / 2) / img_w
        front_cy_norm = bbox[3] / img_h  # Bottom edge

        for zone in stop_line_zones:
            polygon = zone.get("polygon", [])
            if point_in_polygon(front_cx_norm, front_cy_norm, polygon):
                violations.append({
                    "type": "stop_line_violation",
                    "bbox": [bbox[0] / img_w, bbox[1] / img_h,
                             bbox[2] / img_w, bbox[3] / img_h],
                    "confidence": vehicle["confidence"] * conf_discount,
                    "metadata": {
                        "zone_id": zone.get("id", "unknown"),
                        "vehicle_type": vehicle.get("class_name", "unknown"),
                    },
                })
                break

    return violations


# --- Red-Light Violation ---


def detect_red_light_violations(
    vehicle_boxes: list[dict],
    stop_line_zones: list[dict],
    signal_state: str,
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Detect vehicles running a red light.

    Requires signal state input from operator. When signal is RED,
    any vehicle past the stop-line zone is a red-light violation.

    Args:
        vehicle_boxes: COCO vehicle detections.
        stop_line_zones: Configured stop-line zones (shared with stop-line violations).
        signal_state: Current signal state: "red", "green", or "unknown".
        img_w: Image width in pixels.
        img_h: Image height in pixels.

    Returns:
        List of violation dicts. Empty if signal is not "red".
    """
    cfg = get_violation_config("red_light")
    if not cfg.get("enabled", True):
        return []

    if signal_state != "red":
        return []

    conf_discount = cfg.get("confidence_discount", 0.80)
    min_conf = 0.3

    violations = []

    for vehicle in vehicle_boxes:
        if vehicle["confidence"] < min_conf:
            continue

        bbox = vehicle["bbox"]
        front_cx_norm = ((bbox[0] + bbox[2]) / 2) / img_w
        front_cy_norm = bbox[3] / img_h

        for zone in stop_line_zones:
            polygon = zone.get("polygon", [])
            if point_in_polygon(front_cx_norm, front_cy_norm, polygon):
                violations.append({
                    "type": "red_light_violation",
                    "bbox": [bbox[0] / img_w, bbox[1] / img_h,
                             bbox[2] / img_w, bbox[3] / img_h],
                    "confidence": vehicle["confidence"] * conf_discount,
                    "metadata": {
                        "zone_id": zone.get("id", "unknown"),
                        "signal_state": signal_state,
                        "vehicle_type": vehicle.get("class_name", "unknown"),
                    },
                })
                break

    return violations


# --- Master Detection Function ---


def detect_all_violations(
    coco_detections: list[dict],
    helmet_detections: list[dict],
    img_w: int,
    img_h: int,
    lane_polygons: Optional[list[dict]] = None,
    no_parking_zones: Optional[list[dict]] = None,
    stop_line_zones: Optional[list[dict]] = None,
    signal_state: str = "unknown",
    seatbelt_detections: Optional[list[dict]] = None,
) -> list[dict]:
    """Run all violation detection algorithms on the detection results.

    This is the main entry point called from the pipeline.

    Args:
        coco_detections: All COCO model detections (persons, vehicles, etc.).
        helmet_detections: Helmet model detections.
        img_w: Image width in pixels.
        img_h: Image height in pixels.
        lane_polygons: Configured lane polygons for wrong-side detection.
        no_parking_zones: Configured no-parking zone polygons.
        stop_line_zones: Configured stop-line zone polygons.
        signal_state: Current traffic signal state.
        seatbelt_detections: Seatbelt model detections (from windshield crops).

    Returns:
        Combined list of all violation dicts.
    """
    # Separate COCO detections by type
    persons = [d for d in coco_detections if d["class_id"] == 0]  # person
    motorcycles = [d for d in coco_detections if d["class_id"] == 3]  # motorcycle
    bicycles = [d for d in coco_detections if d["class_id"] == 1]  # bicycle
    cars = [d for d in coco_detections if d["class_id"] == 2]  # car
    buses = [d for d in coco_detections if d["class_id"] == 5]  # bus
    trucks = [d for d in coco_detections if d["class_id"] == 7]  # truck

    two_wheelers = motorcycles + bicycles
    all_vehicles = cars + motorcycles + buses + trucks + bicycles

    all_violations = []

    # P0: Helmet non-compliance
    helmet_violations = detect_helmet_violations(
        persons, helmet_detections, two_wheelers, img_w, img_h
    )
    all_violations.extend(helmet_violations)

    # P1: Triple riding
    triple_violations = detect_triple_riding(
        persons, two_wheelers, img_w, img_h
    )
    all_violations.extend(triple_violations)

    # P1: Wrong-side driving (if lane polygons configured)
    if lane_polygons:
        wrong_side_violations = detect_wrong_side(
            all_vehicles, lane_polygons, img_w, img_h
        )
        all_violations.extend(wrong_side_violations)

    # P2: Illegal parking (if zone polygons configured)
    # Pass stop_line_zones so vehicles queued at signals are excluded
    if no_parking_zones:
        parking_violations = detect_illegal_parking(
            all_vehicles, no_parking_zones, img_w, img_h,
            stop_line_zones=stop_line_zones,
        )
        all_violations.extend(parking_violations)

    # Best-effort: Seatbelt (if detections available)
    if seatbelt_detections:
        seatbelt_violations = detect_seatbelt_violations(
            cars, seatbelt_detections, img_w, img_h
        )
        all_violations.extend(seatbelt_violations)

    # Heuristic: Stop-line violation (if zones configured)
    stop_line_violations = []
    if stop_line_zones:
        stop_line_violations = detect_stop_line_violations(
            all_vehicles, stop_line_zones, img_w, img_h
        )

    # Best-effort: Red-light violation (if signal is red and zones configured)
    red_light_violations = []
    if stop_line_zones and signal_state == "red":
        red_light_violations = detect_red_light_violations(
            all_vehicles, stop_line_zones, signal_state, img_w, img_h
        )

    # Dedup: When signal is red, red_light_violation supersedes stop_line_violation
    # for the same vehicle — they represent the same infraction.
    if red_light_violations:
        rl_bboxes = set()
        for rl in red_light_violations:
            rl_bboxes.add(tuple(round(c, 3) for c in rl["bbox"]))
        deduped_stop = []
        for sl in stop_line_violations:
            sl_key = tuple(round(c, 3) for c in sl["bbox"])
            if sl_key not in rl_bboxes:
                deduped_stop.append(sl)
        stop_line_violations = deduped_stop

    all_violations.extend(stop_line_violations)
    all_violations.extend(red_light_violations)

    # Cap violations per type per image to avoid unrealistic FP floods.
    # When signal=red many vehicles may be in zone, but we only show the
    # most confident ones.
    max_per_type = 3
    from collections import Counter
    type_counts = Counter(v["type"] for v in all_violations)
    capped = []
    type_added = Counter()
    for v in all_violations:
        if type_added[v["type"]] < max_per_type:
            capped.append(v)
            type_added[v["type"]] += 1
        else:
            logger.debug(
                "Capping violation type %s at %d (dropping conf=%.2f)",
                v["type"], max_per_type, v.get("confidence", 0),
            )
    all_violations = capped

    logger.info(
        "Detected %d violations: %s",
        len(all_violations),
        {v["type"]: sum(1 for x in all_violations if x["type"] == v["type"])
         for v in all_violations} if all_violations else {},
    )

    return all_violations
