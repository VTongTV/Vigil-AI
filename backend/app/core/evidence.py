"""Evidence generation for traffic violations.

Produces annotated images with bounding boxes, labels, and metadata.
Computes SHA-256 hash for chain-of-custody integrity.
"""

import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from backend.app.config import get_evidence_config, settings

logger = logging.getLogger(__name__)

# Violation type → BGR color mapping for annotations
VIOLATION_COLORS: dict[str, tuple[int, int, int]] = {
    "no_helmet": (0, 0, 255),          # Red
    "triple_riding": (0, 165, 255),     # Orange
    "wrong_side_driving": (0, 255, 255),  # Yellow
    "illegal_parking": (0, 255, 255),   # Yellow
    "no_seatbelt": (255, 0, 255),       # Magenta
    "stop_line_violation": (255, 165, 0),  # Blue-ish
    "red_light_violation": (0, 0, 200),   # Dark Red
    "license_plate": (0, 255, 255),     # Yellow
}

# MV Act sections and fine amounts (mirrors db/models.py FINE_SCHEDULE)
VIOLATION_INFO: dict[str, dict] = {
    "no_helmet": {"section": "129", "amount": 500, "label": "No Helmet"},
    "triple_riding": {"section": "184", "amount": 1000, "label": "Triple Riding"},
    "wrong_side_driving": {"section": "184", "amount": 1000, "label": "Wrong Side"},
    "illegal_parking": {"section": "122", "amount": 200, "label": "Illegal Parking"},
    "no_seatbelt": {"section": "194B", "amount": 1000, "label": "No Seatbelt"},
    "stop_line_violation": {"section": "184", "amount": 1000, "label": "Stop-Line"},
    "red_light_violation": {"section": "184", "amount": 1000, "label": "Red-Light"},
    "license_plate_mismatch": {"section": "177", "amount": 200, "label": "Plate Mismatch"},
}


def generate_evidence_image(
    image: np.ndarray,
    violations: list[dict],
    plate_results: Optional[list[dict]] = None,
    camera_id: Optional[str] = None,
) -> tuple[np.ndarray, str, str]:
    """Generate annotated evidence image with violation overlays.

    Args:
        image: Original BGR image (HWC, uint8).
        violations: List of violation dicts from detect_all_violations().
        plate_results: Optional plate OCR results.
        camera_id: Optional camera identifier.

    Returns:
        Tuple of (annotated_image, filename, sha256_hash).
    """
    cfg = get_evidence_config()
    bbox_thickness = cfg.get("bbox_thickness", 2)
    font_scale = cfg.get("font_scale", 0.6)

    annotated = image.copy()
    h, w = image.shape[:2]

    # Draw violation bboxes
    for v in violations:
        v_type = v["type"]
        color = VIOLATION_COLORS.get(v_type, (0, 0, 255))
        info = VIOLATION_INFO.get(v_type, {"label": v_type, "section": "177", "amount": 200})

        # Convert normalized bbox to pixel coords
        bbox = v["bbox"]
        px1 = int(bbox[0] * w)
        py1 = int(bbox[1] * h)
        px2 = int(bbox[2] * w)
        py2 = int(bbox[3] * h)

        # Draw bounding box
        cv2.rectangle(annotated, (px1, py1), (px2, py2), color, bbox_thickness)

        # Draw label
        conf_pct = int(v["confidence"] * 100)
        label = f"{info['label']} {conf_pct}%"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
        label_w, label_h = label_size

        # Label background
        cv2.rectangle(
            annotated,
            (px1, py1 - label_h - 10),
            (px1 + label_w + 10, py1),
            color,
            -1,
        )
        # Label text
        cv2.putText(
            annotated, label,
            (px1 + 5, py1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),  # White text
            1,
            cv2.LINE_AA,
        )

    # Draw plate detections
    if plate_results:
        for pr in plate_results:
            bbox = pr["bbox"]
            px1 = int(bbox[0] * w)
            py1 = int(bbox[1] * h)
            px2 = int(bbox[2] * w)
            py2 = int(bbox[3] * h)

            cv2.rectangle(annotated, (px1, py1), (px2, py2), (0, 255, 255), 2)
            plate_text = pr.get("text", "")
            if plate_text:
                cv2.putText(
                    annotated, plate_text,
                    (px1, py2 + 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 255),
                    1,
                    cv2.LINE_AA,
                )

    # Add watermark and timestamp
    now = datetime.now(timezone.utc)
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S UTC")
    camera_str = camera_id or "N/A"

    cv2.putText(
        annotated, f"VigilAI",
        (10, h - 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (150, 150, 150),
        1,
        cv2.LINE_AA,
    )
    cv2.putText(
        annotated, f"{timestamp_str} | {camera_str}",
        (10, h - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.4,
        (200, 200, 200),
        1,
        cv2.LINE_AA,
    )

    # Generate filename and hash
    date_part = now.strftime("%Y%m%d_%H%M%S")
    hash_prefix = hashlib.sha256(annotated.tobytes()).hexdigest()[:4]
    filename = f"img_{date_part}_{hash_prefix}.jpg"

    # Compute SHA-256 of the saved JPEG
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
    _, img_bytes = cv2.imencode(".jpg", annotated, encode_params)
    sha256_hash = f"sha256:{hashlib.sha256(img_bytes.tobytes()).hexdigest()}"

    return annotated, filename, sha256_hash


def save_evidence_image(
    annotated: np.ndarray,
    filename: str,
) -> Path:
    """Save annotated evidence image to the evidence directory.

    Args:
        annotated: Annotated BGR image.
        filename: Output filename.

    Returns:
        Path to the saved file.
    """
    evidence_dir = settings.evidence_dir
    if not evidence_dir.exists():
        evidence_dir.mkdir(parents=True, exist_ok=True)

    filepath = evidence_dir / filename
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
    cv2.imwrite(str(filepath), annotated, encode_params)

    logger.info("Evidence image saved: %s", filepath)
    return filepath


def get_evidence_url(filename: str) -> str:
    """Get the URL path for an evidence image served by StaticFiles.

    Args:
        filename: Evidence image filename.

    Returns:
        URL path string.
    """
    return f"/static/evidence/{filename}"
