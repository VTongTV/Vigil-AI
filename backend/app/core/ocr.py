"""License plate OCR using RapidOCR with Indian plate post-processing.

Two-stage pipeline:
    1. YOLOv8n plate detection (on-demand, GPU)
    2. RapidOCR text recognition (CPU)

Indian plate regex validation and common OCR error correction.
"""

import logging
import re
from typing import Optional

import numpy as np
from rapidocr_onnxruntime import RapidOCR

from backend.app.config import get_ocr_config

logger = logging.getLogger(__name__)

_ocr_engine: Optional[RapidOCR] = None


def get_ocr_engine() -> RapidOCR:
    """Get or initialize the RapidOCR engine (singleton).

    RapidOCR runs on CPU only — no CUDA provider to avoid
    competing with YOLOv8 models for VRAM.

    Returns:
        Initialized RapidOCR instance.
    """
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
        logger.info("RapidOCR engine initialized (CPU-only)")
    return _ocr_engine


def recognize_plate(crop: np.ndarray) -> Optional[tuple[str, float]]:
    """Recognize text in a license plate crop.

    Args:
        crop: Cropped plate image (BGR, uint8).

    Returns:
        Tuple of (text, confidence) or None if no text found.
    """
    if crop.size == 0:
        return None

    ocr = get_ocr_engine()
    result, _ = ocr(crop)

    if result and len(result) > 0:
        # result format: [[bbox, text, confidence], ...]
        best = result[0]
        text = best[1]
        conf = float(best[2])
        return text, conf

    return None


def postprocess_plate(raw_text: str) -> Optional[str]:
    """Post-process OCR output for Indian license plate format.

    Handles common OCR errors:
        - O/0 confusion
        - I/1 confusion
        - Missing spaces
        - Extra characters

    Args:
        raw_text: Raw OCR output string.

    Returns:
        Formatted plate string (e.g., "KA01AB1234") or None if invalid.
    """
    # Remove spaces and special characters, uppercase
    cleaned = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper()

    if len(cleaned) < 6:
        return cleaned if cleaned else None

    # Try Indian plate pattern: 2 letters + 1-2 digits + 1-2 letters + 1-4 digits
    # General pattern (not just KA): [A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}
    pattern = r'^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$'
    match = re.match(pattern, cleaned)

    if match:
        state = match.group(1)
        district = match.group(2).zfill(2)
        series = match.group(3)
        number = match.group(4).zfill(4)
        return f"{state}{district}{series}{number}"

    # Try common OCR corrections
    corrected = apply_ocr_corrections(cleaned)
    match = re.match(pattern, corrected)
    if match:
        state = match.group(1)
        district = match.group(2).zfill(2)
        series = match.group(3)
        number = match.group(4).zfill(4)
        return f"{state}{district}{series}{number}"

    # Return cleaned text even if pattern doesn't match
    return cleaned


def apply_ocr_corrections(text: str) -> str:
    """Apply common OCR error corrections for Indian plates.

    Common errors:
        - '0' read as 'O' in district code (should be digits)
        - 'O' read as '0' in series (should be letters)
        - 'I' read as '1' in series

    Args:
        text: Raw uppercase plate text.

    Returns:
        Corrected text.
    """
    if len(text) < 6:
        return text

    # Split into parts based on expected format
    state = text[:2]  # Always 2 letters
    remainder = text[2:]

    # Try to identify district (1-2 digits), series (1-3 letters), number (1-4 digits)
    # Use a greedy-but-limited walk: district max 2 chars, then series, then number
    district = ""
    series = ""
    number = ""
    phase = "district"

    # Ambiguous characters that may be misclassified
    digit_like_letters = {"O", "I"}  # O↔0, I↔1
    letter_like_digits = {"0", "1"}  # 0↔O, 1↔I

    for ch in remainder:
        if phase == "district":
            # District can be at most 2 characters
            if len(district) >= 2:
                # Must move to series
                series += ch
                phase = "series"
            elif ch.isdigit() or ch in digit_like_letters:
                district += ch
            else:
                series += ch
                phase = "series"
        elif phase == "series":
            if ch.isalpha():
                series += ch
            elif ch in letter_like_digits and len(series) < 2 and any(c.isalpha() for c in series) and not number:
                # Ambiguous digit 0/1 in early series position
                # Only if series has at least one real letter and room for more
                series += ch
            else:
                number += ch
                phase = "number"
        else:
            number += ch

    # Corrections:
    # District should be all digits — replace O with 0
    district = district.replace("O", "0")

    # Series should be all letters — replace 0 with O, 1 with I
    series = series.replace("0", "O").replace("1", "I")

    # Number should be all digits — replace O with 0, I with 1
    number = number.replace("O", "0").replace("I", "1")

    return state + district + series + number


def extract_plate_crops(
    image: np.ndarray,
    plate_detections: list[dict],
) -> list[tuple[np.ndarray, dict]]:
    """Extract plate region crops from the image.

    Args:
        image: Full image in BGR format.
        plate_detections: Plate model detections with pixel-coordinate bboxes.

    Returns:
        List of (crop, detection_dict) tuples.
    """
    h, w = image.shape[:2]
    crops = []

    for det in plate_detections:
        bbox = det["bbox"]  # [x1, y1, x2, y2] pixel coords
        x1 = max(0, int(bbox[0]))
        y1 = max(0, int(bbox[1]))
        x2 = min(w, int(bbox[2]))
        y2 = min(h, int(bbox[3]))

        if x2 > x1 and y2 > y1:
            crop = image[y1:y2, x1:x2]
            # Add padding for better OCR (10% on each side)
            pad_h = max(1, int(crop.shape[0] * 0.1))
            pad_w = max(1, int(crop.shape[1] * 0.1))
            crop_padded = cv2_copyMakeBorder(
                crop, pad_h, pad_h, pad_w, pad_w
            )
            crops.append((crop_padded, det))

    return crops


def cv2_copyMakeBorder(
    img: np.ndarray,
    top: int, bottom: int, left: int, right: int,
) -> np.ndarray:
    """Add white border padding to an image.

    Args:
        img: Input image.
        top, bottom, left, right: Padding sizes in pixels.

    Returns:
        Padded image with white border.
    """
    import cv2
    return cv2.copyMakeBorder(
        img, top, bottom, left, right,
        cv2.BORDER_CONSTANT, value=[255, 255, 255],
    )


def process_plates(
    image: np.ndarray,
    plate_detections: list[dict],
    img_w: int,
    img_h: int,
) -> list[dict]:
    """Process plate detections: crop, OCR, post-process.

    Args:
        image: Full image in BGR format.
        plate_detections: Plate model detections.
        img_w: Image width.
        img_h: Image height.

    Returns:
        List of plate result dicts with text, confidence, and bbox.
    """
    crops = extract_plate_crops(image, plate_detections)
    results = []

    for crop, det in crops:
        ocr_result = recognize_plate(crop)
        if ocr_result is not None:
            raw_text, raw_conf = ocr_result
            processed_text = postprocess_plate(raw_text)

            bbox = det["bbox"]
            results.append({
                "text": processed_text or raw_text,
                "raw_text": raw_text,
                "confidence": raw_conf,
                "bbox": [bbox[0] / img_w, bbox[1] / img_h,
                         bbox[2] / img_w, bbox[3] / img_h],
            })

    return results
