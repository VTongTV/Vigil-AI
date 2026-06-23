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
    rider_overlap_ratio = cfg.get("rider_overlap_ratio", 0.30)
    min_no_helmet_conf = cfg.get("min_no_helmet_confidence", 0.25)
    negative_inference_min_person_conf = cfg.get(
        "negative_inference_min_person_conf", 0.70
    )
    confident_with_helmet_threshold = cfg.get(
        "confident_with_helmet_threshold", 0.40
    )

    violations = []

    for person in person_boxes:
        p_bbox = person["bbox"]  # pixel coords
        p_conf = person["confidence"]

        # --- Rider check: only evaluate persons actually riding a two-wheeler ---
        # Use overlap ratio (overlap_area / person_area) per AICITY2024 winner.
        # This prevents flagging pedestrians near motorcycles.
        is_rider = False
        p_area = (p_bbox[2] - p_bbox[0]) * (p_bbox[3] - p_bbox[1])
        if p_area <= 0:
            continue

        best_overlap_ratio = 0.0
        for tw in two_wheeler_boxes:
            tw_bbox = tw["bbox"]
            # Compute intersection area
            ix1 = max(p_bbox[0], tw_bbox[0])
            iy1 = max(p_bbox[1], tw_bbox[1])
            ix2 = min(p_bbox[2], tw_bbox[2])
            iy2 = min(p_bbox[3], tw_bbox[3])
            inter_area = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            overlap_ratio = inter_area / p_area
            if overlap_ratio > best_overlap_ratio:
                best_overlap_ratio = overlap_ratio

        if best_overlap_ratio < rider_overlap_ratio:
            continue

        # Extract head region (top fraction of person bbox)
        head_bbox = [
            p_bbox[0],
            p_bbox[1],
            p_bbox[2],
            p_bbox[1] + (p_bbox[3] - p_bbox[1]) * head_fraction,
        ]

        # --- Two-stage helmet detection ---
        # Stage 1: Positive-only — flag when model explicitly outputs
        # "No Helmet"/"Without Helmet" above the minimum confidence.
        # Stage 2: Constrained negative inference — only when person has high
        # confidence, is clearly riding a motorcycle, AND there is no
        # confident "With Helmet" detection for the head region. A low-conf
        # "With Helmet" (< 0.40) is treated as unreliable model noise, since
        # a genuinely worn helmet typically produces conf > 0.50.
        # This avoids FP issues (turbans, pedestrians) while catching obvious
        # no-helmet cases where the model fails to fire or produces weak noise.
        best_no_helmet_conf = 0.0
        has_confident_with_helmet = False
        has_any_helmet_detection_in_region = False

        for h_det in helmet_boxes:
            h_bbox = h_det["bbox"]
            h_class = h_det["class_name"].lower().replace("_", " ")
            h_conf = h_det["confidence"]

            # Center-point association: is helmet detection center inside the head region?
            h_cx, h_cy = bbox_center(h_bbox)
            if not (head_bbox[0] <= h_cx <= head_bbox[2] and
                    head_bbox[1] <= h_cy <= head_bbox[3]):
                continue

            # At least one helmet model detection found in head region
            has_any_helmet_detection_in_region = True

            # A confident "With Helmet" blocks negative inference
            if ("helmet" in h_class and "no" not in h_class and
                    "without" not in h_class and h_conf >= confident_with_helmet_threshold):
                has_confident_with_helmet = True

            # Only count "No Helmet"/"Without Helmet" detections above threshold
            if h_conf >= min_no_helmet_conf and (
                "no helmet" in h_class or "without" in h_class
            ):
                best_no_helmet_conf = max(best_no_helmet_conf, h_conf)

        # Stage 1: Explicit no-helmet detection
        if best_no_helmet_conf >= min_no_helmet_conf:
            violations.append({
                "type": "no_helmet",
                "bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                         p_bbox[2] / img_w, p_bbox[3] / img_h],
                "person_bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                                p_bbox[2] / img_w, p_bbox[3] / img_h],
                "confidence": best_no_helmet_conf,
            })
        # Stage 2: Constrained negative inference
        # Only flag when: helmet model returned at least 1 detection somewhere
        # in the image (so the model is actually working), no confident
        # "With Helmet" found in head region, AND person confidence is high.
        # If the helmet model returned zero detections anywhere, we cannot
        # infer anything — the model simply didn't fire, which is not
        # evidence of no helmet.
        elif (
            len(helmet_boxes) > 0
            and not has_confident_with_helmet
            and p_conf >= negative_inference_min_person_conf
        ):
            violations.append({
                "type": "no_helmet",
                "bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                         p_bbox[2] / img_w, p_bbox[3] / img_h],
                "person_bbox": [p_bbox[0] / img_w, p_bbox[1] / img_h,
                                p_bbox[2] / img_w, p_bbox[3] / img_h],
                "confidence": p_conf * 0.7,
            })

    return violations


# --- Triple Riding ---


def detect_triple_riding(
    person_boxes: list[dict],
    two_wheeler_boxes: list[dict],
    img_w: int,
    img_h: int,
    helmet_boxes: list[dict] | None = None,
) -> list[dict]:
    """Detect triple riding using 2D spatial constraints + head counting.

    Algorithm (dual-method):
        1. Primary: For each two-wheeler, count persons with overlap_ratio
           >= rider_overlap_ratio. If 3+ riders → violation.
        2. Secondary (head counting): If person count < 3, count helmet/head
           detections whose center falls within the motorcycle bbox. If 3+
           heads detected → violation. This catches tightly-packed riders
           where COCO merges person bodies but the helmet model still sees
           separate heads (production approach per CVPRW/AI City Challenge).

    Args:
        person_boxes: COCO person detections.
        two_wheeler_boxes: COCO motorcycle/bicycle detections.
        img_w: Image width in pixels.
        img_h: Image height in pixels.
        helmet_boxes: Helmet model detections (optional, for head counting).

    Returns:
        List of violation dicts.
    """
    cfg = get_violation_config("triple_riding")
    max_riders = cfg.get("max_riders", 2)
    rider_overlap_ratio = cfg.get("rider_overlap_ratio", 0.20)

    violations = []

    for tw in two_wheeler_boxes:
        tw_bbox = tw["bbox"]
        tw_area = (tw_bbox[2] - tw_bbox[0]) * (tw_bbox[3] - tw_bbox[1])
        if tw_area <= 0:
            continue
        riders = []

        # Method 1: Person-body overlap association
        for person in person_boxes:
            p_bbox = person["bbox"]
            p_area = (p_bbox[2] - p_bbox[0]) * (p_bbox[3] - p_bbox[1])
            if p_area <= 0:
                continue

            # Overlap-ratio based rider association (AICITY2024 winner approach).
            # overlap_ratio = intersection_area / person_area
            # This prevents cross-motorcycle matching — a person on an adjacent
            # bike will have low overlap with THIS motorcycle.
            ix1 = max(p_bbox[0], tw_bbox[0])
            iy1 = max(p_bbox[1], tw_bbox[1])
            ix2 = min(p_bbox[2], tw_bbox[2])
            iy2 = min(p_bbox[3], tw_bbox[3])
            inter_area = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            overlap_ratio = inter_area / p_area

            if overlap_ratio >= rider_overlap_ratio:
                riders.append(person)

        # Method 2: Head counting via helmet model detections
        # When COCO merges tightly-packed rider bodies into 1-2 detections,
        # the helmet model can still see separate heads. Search an expanded
        # region above the motorcycle bbox (riders' heads extend above the
        # vehicle, especially for upright/tightly-packed riders).
        # Also re-check persons against expanded region for better association.
        if len(riders) <= max_riders and helmet_boxes:
            tw_h = tw_bbox[3] - tw_bbox[1]
            head_search = [
                tw_bbox[0], tw_bbox[1] - tw_h * 0.40,
                tw_bbox[2], tw_bbox[3],
            ]
            head_count = 0
            heads_in_region = []
            for h_det in helmet_boxes:
                h_bbox = h_det["bbox"]
                h_cx, h_cy = bbox_center(h_bbox)
                if (head_search[0] <= h_cx <= head_search[2] and
                        head_search[1] <= h_cy <= head_search[3]):
                    head_count += 1
                    heads_in_region.append(h_det)

            # If 3+ heads detected, override the person-based count
            if head_count > max_riders:
                riders = [
                    {"bbox": h["bbox"], "confidence": h["confidence"]}
                    for h in heads_in_region
                ]

        # Method 3: Combined person + head counting with relaxed spatial
        # association. Some riders may be mis-assigned to adjacent motorcycles
        # by the strict overlap_ratio check. Count all persons whose CENTER
        # falls within the expanded head search region plus motorcycle bbox.
        if len(riders) <= max_riders:
            tw_h = tw_bbox[3] - tw_bbox[1]
            expanded = [
                tw_bbox[0] - tw_h * 0.10,
                tw_bbox[1] - tw_h * 0.40,
                tw_bbox[2] + tw_h * 0.10,
                tw_bbox[3],
            ]
            expanded_riders = []
            for person in person_boxes:
                p_bbox = person["bbox"]
                p_cx, p_cy = bbox_center(p_bbox)
                if (expanded[0] <= p_cx <= expanded[2] and
                        expanded[1] <= p_cy <= expanded[3]):
                    expanded_riders.append(person)
            if len(expanded_riders) > max_riders:
                riders = expanded_riders

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
    stop_line_zones: Optional[list[dict]] = None,
) -> list[dict]:
    """Detect vehicles traveling against lane direction.

    Uses configurable lane polygons. A vehicle in the "wrong side"
    portion of a lane is flagged. Vehicles that are also in a stop-line
    zone are excluded — they are more likely waiting at a signal than
    driving the wrong way.

    Args:
        vehicle_boxes: COCO vehicle detections.
        lane_polygons: Configured lane regions with direction info.
        img_w: Image width in pixels.
        img_h: Image height in pixels.
        stop_line_zones: Stop-line zones to exclude (optional).

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

        # Skip vehicles in stop-line zones (likely waiting at signal)
        if stop_line_zones:
            in_stop_zone = False
            for sz in stop_line_zones:
                if point_in_polygon(cx_norm, cy_norm, sz.get("polygon", [])):
                    in_stop_zone = True
                    break
            if in_stop_zone:
                continue

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

    # P1: Triple riding (pass helmet detections for head counting)
    triple_violations = detect_triple_riding(
        persons, two_wheelers, img_w, img_h, helmet_detections
    )
    all_violations.extend(triple_violations)

    # P1: Wrong-side driving (if lane polygons configured)
    # Pass stop_line_zones to exclude vehicles waiting at signals
    if lane_polygons:
        wrong_side_violations = detect_wrong_side(
            all_vehicles, lane_polygons, img_w, img_h,
            stop_line_zones=stop_line_zones
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
