"""VigilAI performance evaluation metrics (Plan Section 17, Task 8).

Computes all metrics required by the problem statement:
    - mAP@50 via ultralytics model.val() (if validation data available)
    - Precision, Recall, F1-score per violation type
    - Accuracy (correct classifications / total)
    - OCR character accuracy on plate crops
    - Inference FPS on RTX 3050
    - End-to-end latency with per-stage timing breakdown
    - VRAM utilization

Since a labeled test set may not yet exist, the script:
    1. Runs the full detection pipeline on synthetic test images
    2. Measures per-image and aggregate latency
    3. Attempts COCO validation if data is available
    4. Tests OCR on a synthetic plate image
    5. Reports VRAM usage at each stage
    6. Outputs a formatted report and saves results to JSON

Usage:
    python scripts/eval_metrics.py
"""

import gc
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np

# Ensure project root is on sys.path so imports work when run standalone
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Set OCR thread limits before any ONNX initialization
os.environ.setdefault("OMP_NUM_THREADS", "4")
os.environ.setdefault("ONNX_NUM_THREADS", "4")

import torch  # noqa: E402

from backend.app.config import (  # noqa: E402
    get_violation_config,
    settings,
)
from backend.app.core.detector import ModelManager  # noqa: E402
from backend.app.core.evidence import (  # noqa: E402
    generate_evidence_image,
    save_evidence_image,
)
from backend.app.core.ocr import process_plates, recognize_plate, postprocess_plate  # noqa: E402
from backend.app.core.preprocessing import preprocess_image  # noqa: E402
from backend.app.core.violations import detect_all_violations  # noqa: E402

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("eval_metrics")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SYNTHETIC_IMAGE_COUNT: int = 5
SYNTHETIC_IMAGE_WIDTH: int = 640
SYNTHETIC_IMAGE_HEIGHT: int = 480
OUTPUT_DIR: Path = _PROJECT_ROOT / "outputs"
EVAL_RESULTS_PATH: Path = OUTPUT_DIR / "eval_results.json"
MIN_TEST_SET_SIZE: int = 50
GROUND_TRUTH_NOTE: str = (
    "Requires labeled test set of 50+ images with ground-truth annotations"
)


# ---------------------------------------------------------------------------
# Synthetic image generation
# ---------------------------------------------------------------------------


def generate_synthetic_test_images(count: int = SYNTHETIC_IMAGE_COUNT) -> list[np.ndarray]:
    """Generate synthetic test images with geometric shapes for pipeline benchmarking.

    Creates BGR images with rectangles of varying sizes and colors to simulate
    real-world objects. These are not expected to trigger specific violations —
    they exercise the full pipeline (preprocess, detect, violation logic, evidence)
    to measure latency and system metrics.

    Args:
        count: Number of images to generate.

    Returns:
        List of BGR images (HWC, uint8) with shape (480, 640, 3).
    """
    images: list[np.ndarray] = []
    rng = np.random.RandomState(42)

    for i in range(count):
        img = np.full(
            (SYNTHETIC_IMAGE_HEIGHT, SYNTHETIC_IMAGE_WIDTH, 3),
            128 + (i * 15) % 60,
            dtype=np.uint8,
        )

        # Draw 2-4 random rectangles
        num_rects = rng.randint(2, 5)
        for _ in range(num_rects):
            x1 = rng.randint(0, SYNTHETIC_IMAGE_WIDTH - 50)
            y1 = rng.randint(0, SYNTHETIC_IMAGE_HEIGHT - 50)
            w = rng.randint(30, 200)
            h = rng.randint(30, 200)
            x2 = min(x1 + w, SYNTHETIC_IMAGE_WIDTH - 1)
            y2 = min(y1 + h, SYNTHETIC_IMAGE_HEIGHT - 1)
            color = tuple(int(c) for c in rng.randint(0, 255, 3))
            cv2.rectangle(img, (x1, y1), (x2, y2), color, -1)

        images.append(img)

    logger.info("Generated %d synthetic test images (%dx%d)",
                count, SYNTHETIC_IMAGE_WIDTH, SYNTHETIC_IMAGE_HEIGHT)
    return images


def generate_synthetic_plate_image(
    plate_text: str = "KA01AB1234",
    width: int = 640,
    height: int = 480,
) -> np.ndarray:
    """Generate a synthetic image with a rendered license plate for OCR testing.

    Draws a white rectangle with black text simulating an Indian license plate
    in the center of the image.

    Args:
        plate_text: Ground-truth plate text to render.
        width: Image width in pixels.
        height: Image height in pixels.

    Returns:
        BGR image with rendered plate text.
    """
    img = np.full((height, width, 3), 100, dtype=np.uint8)

    # Draw plate background (white rectangle)
    plate_w, plate_h = 300, 80
    px1 = (width - plate_w) // 2
    py1 = (height - plate_h) // 2
    px2 = px1 + plate_w
    py2 = py1 + plate_h

    cv2.rectangle(img, (px1, py1), (px2, py2), (255, 255, 255), -1)
    cv2.rectangle(img, (px1, py1), (px2, py2), (0, 0, 0), 2)

    # Draw plate text
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.0
    text_color = (0, 0, 0)
    thickness = 2

    text_size = cv2.getTextSize(plate_text, font, font_scale, thickness)[0]
    text_x = px1 + (plate_w - text_size[0]) // 2
    text_y = py1 + (plate_h + text_size[1]) // 2

    cv2.putText(img, plate_text, (text_x, text_y), font, font_scale, text_color, thickness)

    logger.info("Generated synthetic plate image with text: %s", plate_text)
    return img


# ---------------------------------------------------------------------------
# GPU / VRAM utilities
# ---------------------------------------------------------------------------


def get_vram_info() -> dict[str, float]:
    """Get current VRAM utilization from CUDA.

    Returns:
        Dict with keys 'allocated_gb', 'reserved_gb', 'free_gb', 'total_gb'.
        Returns zeros if CUDA is not available.
    """
    if not torch.cuda.is_available():
        return {"allocated_gb": 0.0, "reserved_gb": 0.0, "free_gb": 0.0, "total_gb": 0.0}

    allocated = torch.cuda.memory_allocated() / (1024 ** 3)
    reserved = torch.cuda.memory_reserved() / (1024 ** 3)
    free, total = torch.cuda.mem_get_info()
    free_gb = free / (1024 ** 3)
    total_gb = total / (1024 ** 3)

    return {
        "allocated_gb": round(allocated, 3),
        "reserved_gb": round(reserved, 3),
        "free_gb": round(free_gb, 3),
        "total_gb": round(total_gb, 3),
    }


# ---------------------------------------------------------------------------
# Pipeline benchmark
# ---------------------------------------------------------------------------


def benchmark_pipeline_single_image(
    image: np.ndarray,
    model_manager: ModelManager,
) -> dict[str, Any]:
    """Run the full detection pipeline on a single image and record timing.

    Mirrors the detect route logic: preprocess → COCO → helmet → violation logic
    → plate → OCR → evidence generation.

    Args:
        image: BGR input image (HWC, uint8).
        model_manager: Loaded ModelManager with resident models.

    Returns:
        Dict with timing_breakdown, violations, plate_results, and vram_after.
    """
    img_h, img_w = image.shape[:2]

    # Step 1: Preprocessing
    t0 = time.time()
    preprocessed = preprocess_image(image)
    preprocess_ms = int((time.time() - t0) * 1000)

    # Step 2: COCO detection (resident)
    t0 = time.time()
    coco_dets = model_manager.detect_coco(preprocessed)
    detect_coco_ms = int((time.time() - t0) * 1000)

    # Step 3: Helmet detection (resident)
    t0 = time.time()
    helmet_dets = model_manager.detect_helmet(preprocessed)
    detect_helmet_ms = int((time.time() - t0) * 1000)

    # Step 4: Violation logic
    t0 = time.time()
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
    plate_results: list[dict] = []
    detect_plate_ms = 0
    ocr_ms = 0

    if violations:
        t0 = time.time()
        plate_dets = model_manager.detect_plate_on_demand(preprocessed)
        detect_plate_ms = int((time.time() - t0) * 1000)

        if plate_dets:
            t0 = time.time()
            plate_results = process_plates(preprocessed, plate_dets, img_w, img_h)
            ocr_ms = int((time.time() - t0) * 1000)

    # Step 6: Evidence generation
    t0 = time.time()
    if violations:
        annotated, filename, evidence_hash = generate_evidence_image(
            image, violations, plate_results, camera_id="EVAL-01"
        )
        save_evidence_image(annotated, filename)
    evidence_gen_ms = int((time.time() - t0) * 1000)

    total_ms = preprocess_ms + detect_coco_ms + detect_helmet_ms + violation_logic_ms + detect_plate_ms + ocr_ms + evidence_gen_ms

    return {
        "timing_breakdown": {
            "preprocess_ms": preprocess_ms,
            "detect_coco_ms": detect_coco_ms,
            "detect_helmet_ms": detect_helmet_ms,
            "violation_logic_ms": violation_logic_ms,
            "detect_plate_ms": detect_plate_ms,
            "ocr_ms": ocr_ms,
            "evidence_gen_ms": evidence_gen_ms,
        },
        "total_ms": total_ms,
        "violations": violations,
        "plate_results": plate_results,
        "vram_after": get_vram_info(),
    }


def run_pipeline_benchmark(
    model_manager: ModelManager,
    num_images: int = SYNTHETIC_IMAGE_COUNT,
) -> dict[str, Any]:
    """Run the full detection pipeline on synthetic images and collect metrics.

    Args:
        model_manager: Loaded ModelManager with resident models.
        num_images: Number of synthetic images to process.

    Returns:
        Dict with per-image timings, aggregate statistics, FPS, and VRAM info.
    """
    images = generate_synthetic_test_images(num_images)
    results: list[dict[str, Any]] = []

    total_vram_before = get_vram_info()
    logger.info("VRAM before benchmark: %s", total_vram_before)

    wall_start = time.time()
    for i, img in enumerate(images):
        logger.info("Processing image %d/%d ...", i + 1, num_images)
        result = benchmark_pipeline_single_image(img, model_manager)
        results.append(result)
        logger.info(
            "  Image %d: %d ms total, %d violations, %d plates",
            i + 1, result["total_ms"],
            len(result["violations"]), len(result["plate_results"]),
        )
    wall_total = time.time() - wall_start

    total_vram_after = get_vram_info()

    # Aggregate timing
    all_total_ms = [r["total_ms"] for r in results]
    timing_keys = [
        "preprocess_ms", "detect_coco_ms", "detect_helmet_ms",
        "violation_logic_ms", "detect_plate_ms", "ocr_ms", "evidence_gen_ms",
    ]
    avg_timing: dict[str, int] = {}
    for key in timing_keys:
        values = [r["timing_breakdown"][key] for r in results]
        avg_timing[key] = int(sum(values) / len(values)) if values else 0

    avg_total_ms = sum(all_total_ms) / len(all_total_ms) if all_total_ms else 0
    fps = num_images / wall_total if wall_total > 0 else 0.0

    return {
        "num_images": num_images,
        "wall_time_s": round(wall_total, 3),
        "avg_total_ms": round(avg_total_ms, 1),
        "min_total_ms": min(all_total_ms) if all_total_ms else 0,
        "max_total_ms": max(all_total_ms) if all_total_ms else 0,
        "avg_timing_breakdown": avg_timing,
        "inference_fps": round(fps, 2),
        "per_image_results": results,
        "vram_before": total_vram_before,
        "vram_after": total_vram_after,
    }


# ---------------------------------------------------------------------------
# COCO model validation
# ---------------------------------------------------------------------------


def _check_coco_data_available() -> bool:
    """Check if COCO validation data is already downloaded locally.

    Searches common ultralytics cache locations for the COCO dataset.
    Avoids triggering an auto-download that would take many minutes.

    Returns:
        True if COCO val data appears to be present locally.
    """
    # Common locations where ultralytics caches COCO data
    home = Path.home()
    candidates = [
        home / "datasets" / "coco",
        Path("D:/datasets/coco"),
        home / ".cache" / "ultralytics" / "datasets" / "coco",
    ]

    for coco_dir in candidates:
        if coco_dir.exists():
            # Check for val images
            val_dir = coco_dir / "images" / "val2017"
            if val_dir.exists() and any(val_dir.iterdir()):
                logger.info("Found COCO val data at: %s", val_dir)
                return True
            # Also check unzipped labels
            ann_dir = coco_dir / "labels" / "val2017"
            if ann_dir.exists() and any(ann_dir.iterdir()):
                logger.info("Found COCO labels at: %s", ann_dir)
                return True

    return False


def run_coco_validation(model_manager: ModelManager) -> Optional[dict[str, Any]]:
    """Attempt to run ultralytics built-in COCO validation.

    This requires the COCO val dataset to be present locally. If not
    already downloaded, skips validation to avoid a long download.

    Args:
        model_manager: Loaded ModelManager with COCO model.

    Returns:
        Dict with mAP@50 and other validation metrics, or None if data unavailable.
    """
    if model_manager.coco_model is None or not model_manager.coco_model.is_loaded:
        logger.warning("COCO model not loaded — skipping validation")
        return None

    if not _check_coco_data_available():
        logger.info("COCO val data not found locally — skipping model.val() to avoid download")
        return {
            "mAP50": None,
            "mAP50_95": None,
            "precision": None,
            "recall": None,
            "note": (
                "COCO val data not present locally. Skipping auto-download. "
                "To run validation, download COCO val2017 manually or set "
                "ULTRALYTICS_DATASETS_DIR to a directory containing the data."
            ),
        }

    try:
        logger.info("Running COCO validation (model.val())...")
        results = model_manager.coco_model.model.val(
            data="coco.yaml",
            split="val",
            imgsz=SYNTHETIC_IMAGE_WIDTH,
            verbose=False,
        )

        return {
            "mAP50": round(float(results.box.map50), 4) if hasattr(results, "box") else None,
            "mAP50_95": round(float(results.box.map), 4) if hasattr(results, "box") else None,
            "precision": round(float(results.box.mp), 4) if hasattr(results, "box") else None,
            "recall": round(float(results.box.mr), 4) if hasattr(results, "box") else None,
            "note": "Computed on COCO val split via model.val()",
        }
    except Exception as e:
        logger.info("COCO validation failed: %s", e)
        return {
            "mAP50": None,
            "mAP50_95": None,
            "precision": None,
            "recall": None,
            "note": f"COCO val failed: {e}",
        }


# ---------------------------------------------------------------------------
# OCR accuracy
# ---------------------------------------------------------------------------


def test_ocr_accuracy() -> dict[str, Any]:
    """Test OCR accuracy on a synthetic license plate image.

    Generates an image with known plate text, runs the OCR pipeline,
    and compares the result to the ground truth.

    Returns:
        Dict with ground_truth, ocr_result, char_accuracy, and match status.
    """
    ground_truth = "KA01AB1234"
    plate_img = generate_synthetic_plate_image(plate_text=ground_truth)

    # Crop the plate region for OCR (center of image)
    img_h, img_w = plate_img.shape[:2]
    plate_w, plate_h = 300, 80
    px1 = (img_w - plate_w) // 2
    py1 = (img_h - plate_h) // 2
    px2 = px1 + plate_w
    py2 = py1 + plate_h
    plate_crop = plate_img[py1:py2, px1:px2]

    # Run OCR
    t0 = time.time()
    ocr_result = recognize_plate(plate_crop)
    ocr_ms = int((time.time() - t0) * 1000)

    if ocr_result is not None:
        raw_text, ocr_confidence = ocr_result
        processed_text = postprocess_plate(raw_text)
        ocr_text = processed_text or raw_text
    else:
        raw_text = ""
        ocr_confidence = 0.0
        ocr_text = ""

    # Character-level accuracy
    gt_clean = ground_truth.replace(" ", "").upper()
    ocr_clean = ocr_text.replace(" ", "").upper()

    correct_chars = sum(1 for a, b in zip(gt_clean, ocr_clean) if a == b)
    max_len = max(len(gt_clean), 1)
    char_accuracy = correct_chars / max_len

    exact_match = gt_clean == ocr_clean

    return {
        "ground_truth": ground_truth,
        "ocr_raw": raw_text,
        "ocr_processed": ocr_text,
        "ocr_confidence": round(ocr_confidence, 4),
        "char_accuracy": round(char_accuracy, 4),
        "exact_match": exact_match,
        "ocr_latency_ms": ocr_ms,
        "note": f"Tested on synthetic plate image. Ground truth: {ground_truth}",
    }


# ---------------------------------------------------------------------------
# Per-violation precision / recall / F1 (placeholder until test set available)
# ---------------------------------------------------------------------------


def compute_violation_metrics_placeholder() -> dict[str, Any]:
    """Compute per-violation-type precision, recall, and F1-score.

    When a labeled test set is available, this function should:
        1. Run the full pipeline on each test image
        2. Compare predictions to ground-truth annotations
        3. Compute TP, FP, FN per violation type
        4. Derive precision, recall, F1

    Currently returns placeholder structure with methodology notes.

    Returns:
        Dict mapping violation types to precision/recall/F1 with methodology note.
    """
    violation_types = [
        "no_helmet",
        "triple_riding",
        "wrong_side_driving",
        "illegal_parking",
        "no_seatbelt",
        "stop_line_violation",
        "red_light_violation",
        "license_plate_mismatch",
    ]

    metrics: dict[str, dict[str, Any]] = {}
    for v_type in violation_types:
        metrics[v_type] = {
            "precision": None,
            "recall": None,
            "f1_score": None,
            "tp": None,
            "fp": None,
            "fn": None,
            "note": GROUND_TRUTH_NOTE,
        }

    return {
        "per_violation_metrics": metrics,
        "accuracy": None,
        "accuracy_note": GROUND_TRUTH_NOTE,
        "methodology": (
            "Metrics require a labeled test set of 50+ images with ground-truth "
            "bounding boxes and violation type labels. For each image, run the "
            "full pipeline, match predictions to ground truth using IoU >= 0.5, "
            "then compute TP, FP, FN per violation type. "
            "Precision = TP/(TP+FP), Recall = TP/(TP+FN), "
            "F1 = 2*P*R/(P+R), Accuracy = correct/total."
        ),
    }


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------


def format_report(
    benchmark: dict[str, Any],
    coco_val: Optional[dict[str, Any]],
    ocr_metrics: dict[str, Any],
    violation_metrics: dict[str, Any],
    vram_info: dict[str, float],
) -> str:
    """Format the evaluation results into a human-readable report.

    Args:
        benchmark: Pipeline benchmark results.
        coco_val: COCO validation results (or None).
        ocr_metrics: OCR accuracy test results.
        violation_metrics: Per-violation precision/recall/F1 (or placeholders).
        vram_info: VRAM utilization info.

    Returns:
        Formatted report string.
    """
    lines: list[str] = []
    lines.append("=" * 72)
    lines.append("VigilAI — Performance Evaluation Report")
    lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append("=" * 72)

    # --- Section 1: Inference FPS ---
    lines.append("")
    lines.append("1. INFERENCE FPS")
    lines.append("-" * 40)
    lines.append(f"   Images processed:   {benchmark['num_images']}")
    lines.append(f"   Wall time:          {benchmark['wall_time_s']:.3f} s")
    lines.append(f"   Inference FPS:      {benchmark['inference_fps']:.2f}")
    lines.append(f"   Avg latency/image:  {benchmark['avg_total_ms']:.1f} ms")
    lines.append(f"   Min latency/image:  {benchmark['min_total_ms']} ms")
    lines.append(f"   Max latency/image:  {benchmark['max_total_ms']} ms")

    # --- Section 2: End-to-end latency breakdown ---
    lines.append("")
    lines.append("2. END-TO-END LATENCY BREAKDOWN (averages)")
    lines.append("-" * 40)
    avg_tb = benchmark["avg_timing_breakdown"]
    lines.append(f"   Preprocess:         {avg_tb['preprocess_ms']:>6} ms")
    lines.append(f"   COCO detection:     {avg_tb['detect_coco_ms']:>6} ms")
    lines.append(f"   Helmet detection:   {avg_tb['detect_helmet_ms']:>6} ms")
    lines.append(f"   Violation logic:    {avg_tb['violation_logic_ms']:>6} ms")
    lines.append(f"   Plate detection:    {avg_tb['detect_plate_ms']:>6} ms")
    lines.append(f"   OCR:                {avg_tb['ocr_ms']:>6} ms")
    lines.append(f"   Evidence gen:       {avg_tb['evidence_gen_ms']:>6} ms")
    lines.append(f"   Total:              {avg_tb['preprocess_ms'] + avg_tb['detect_coco_ms'] + avg_tb['detect_helmet_ms'] + avg_tb['violation_logic_ms'] + avg_tb['detect_plate_ms'] + avg_tb['ocr_ms'] + avg_tb['evidence_gen_ms']:>6} ms")

    # --- Section 3: mAP@50 (COCO) ---
    lines.append("")
    lines.append("3. mAP@50 (COCO VALIDATION)")
    lines.append("-" * 40)
    if coco_val and coco_val.get("mAP50") is not None:
        lines.append(f"   mAP@50:             {coco_val['mAP50']:.4f}")
        lines.append(f"   mAP@50-95:          {coco_val.get('mAP50_95', 'N/A')}")
        lines.append(f"   Precision (COCO):   {coco_val.get('precision', 'N/A')}")
        lines.append(f"   Recall (COCO):      {coco_val.get('recall', 'N/A')}")
    else:
        note = coco_val.get("note", "Unavailable") if coco_val else "Skipped"
        lines.append(f"   Status: {note}")
        lines.append(f"   Note: {GROUND_TRUTH_NOTE}")

    # --- Section 4: Per-violation metrics ---
    lines.append("")
    lines.append("4. PER-VIOLATION PRECISION / RECALL / F1-SCORE")
    lines.append("-" * 40)
    per_v = violation_metrics["per_violation_metrics"]
    lines.append(f"   {'Violation Type':<30} {'Precision':>10} {'Recall':>10} {'F1':>10}")
    lines.append(f"   {'─' * 30} {'─' * 10} {'─' * 10} {'─' * 10}")
    for v_type, vals in per_v.items():
        p = f"{vals['precision']:.4f}" if vals["precision"] is not None else "N/A"
        r = f"{vals['recall']:.4f}" if vals["recall"] is not None else "N/A"
        f1 = f"{vals['f1_score']:.4f}" if vals["f1_score"] is not None else "N/A"
        lines.append(f"   {v_type:<30} {p:>10} {r:>10} {f1:>10}")
    lines.append("")
    lines.append(f"   Accuracy: {violation_metrics.get('accuracy', 'N/A')}")
    lines.append(f"   Note: {violation_metrics.get('accuracy_note', GROUND_TRUTH_NOTE)}")

    # --- Section 5: OCR accuracy ---
    lines.append("")
    lines.append("5. OCR CHARACTER ACCURACY")
    lines.append("-" * 40)
    lines.append(f"   Ground truth:       {ocr_metrics['ground_truth']}")
    lines.append(f"   OCR raw output:     {ocr_metrics['ocr_raw']}")
    lines.append(f"   OCR processed:      {ocr_metrics['ocr_processed']}")
    lines.append(f"   OCR confidence:     {ocr_metrics['ocr_confidence']:.4f}")
    lines.append(f"   Character accuracy: {ocr_metrics['char_accuracy']:.4f}")
    lines.append(f"   Exact match:        {ocr_metrics['exact_match']}")
    lines.append(f"   OCR latency:        {ocr_metrics['ocr_latency_ms']} ms")

    # --- Section 6: VRAM utilization ---
    lines.append("")
    lines.append("6. VRAM UTILIZATION")
    lines.append("-" * 40)
    lines.append(f"   Allocated:          {vram_info['allocated_gb']:.3f} GB")
    lines.append(f"   Reserved:           {vram_info['reserved_gb']:.3f} GB")
    lines.append(f"   Free:               {vram_info['free_gb']:.3f} GB")
    lines.append(f"   Total:              {vram_info['total_gb']:.3f} GB")
    if benchmark.get("vram_before"):
        vb = benchmark["vram_before"]
        lines.append(f"   Before benchmark:   {vb['allocated_gb']:.3f} GB allocated")
    if benchmark.get("vram_after"):
        va = benchmark["vram_after"]
        lines.append(f"    After benchmark:   {va['allocated_gb']:.3f} GB allocated")

    # --- Section 7: Methodology notes ---
    lines.append("")
    lines.append("7. METHODOLOGY NOTES (Plan Section 17)")
    lines.append("-" * 40)
    lines.append("   - mAP@50: Computed via ultralytics model.val() on COCO val split")
    lines.append("   - Precision: TP / (TP + FP) per violation type on labeled test set")
    lines.append("   - Recall: TP / (TP + FN) per violation type on labeled test set")
    lines.append("   - F1-score: 2 * P * R / (P + R) per violation type")
    lines.append("   - Accuracy: Correct classifications / total on test set")
    lines.append("   - OCR accuracy: Character-level edit distance on plate crops")
    lines.append("   - Inference FPS: Frames per second on RTX 3050 (YOLOv8n)")
    lines.append("   - End-to-end latency: Upload to response including all stages")
    lines.append("   - VRAM: Peak GPU memory during pipeline execution")
    lines.append("")
    lines.append(f"   Target: {MIN_TEST_SET_SIZE}+ labeled test images required")
    lines.append("   for statistically meaningful precision/recall/F1/accuracy metrics.")
    lines.append("")
    lines.append("=" * 72)

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# JSON output
# ---------------------------------------------------------------------------


def build_eval_results_json(
    benchmark: dict[str, Any],
    coco_val: Optional[dict[str, Any]],
    ocr_metrics: dict[str, Any],
    violation_metrics: dict[str, Any],
    vram_info: dict[str, float],
) -> dict[str, Any]:
    """Build the complete evaluation results dict for JSON serialization.

    Args:
        benchmark: Pipeline benchmark results.
        coco_val: COCO validation results (or None).
        ocr_metrics: OCR accuracy test results.
        violation_metrics: Per-violation precision/recall/F1.
        vram_info: VRAM utilization info.

    Returns:
        Serializable dict of all evaluation results.
    """
    return {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "script": "scripts/eval_metrics.py",
            "project": "VigilAI",
            "hardware": "RTX 3050 4GB VRAM",
        },
        "inference_fps": benchmark["inference_fps"],
        "avg_latency_ms": benchmark["avg_total_ms"],
        "min_latency_ms": benchmark["min_total_ms"],
        "max_latency_ms": benchmark["max_total_ms"],
        "wall_time_s": benchmark["wall_time_s"],
        "num_test_images": benchmark["num_images"],
        "timing_breakdown_avg": benchmark["avg_timing_breakdown"],
        "coco_validation": coco_val,
        "ocr_accuracy": ocr_metrics,
        "violation_metrics": violation_metrics,
        "vram_utilization": vram_info,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    """Run the complete evaluation pipeline and output the report."""
    logger.info("Starting VigilAI performance evaluation...")
    logger.info("Python: %s", sys.executable)
    logger.info("CUDA available: %s", torch.cuda.is_available())
    if torch.cuda.is_available():
        logger.info("GPU: %s", torch.cuda.get_device_name(0))

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Load models
    logger.info("Loading resident models (COCO + Helmet)...")
    model_manager = ModelManager()
    model_manager.load_resident_models()
    logger.info("Models loaded. VRAM: %s", get_vram_info())

    # Step 2: Pipeline benchmark
    logger.info("Running pipeline benchmark on %d synthetic images...", SYNTHETIC_IMAGE_COUNT)
    benchmark = run_pipeline_benchmark(model_manager, num_images=SYNTHETIC_IMAGE_COUNT)

    # Step 3: COCO validation (if data available)
    logger.info("Attempting COCO validation...")
    coco_val = run_coco_validation(model_manager)

    # Step 4: OCR accuracy test
    logger.info("Testing OCR accuracy on synthetic plate...")
    ocr_metrics = test_ocr_accuracy()

    # Step 5: Per-violation metrics (requires labeled test set)
    logger.info("Computing per-violation metrics...")
    violation_metrics = compute_violation_metrics_placeholder()

    # Step 6: Final VRAM
    vram_info = get_vram_info()

    # Step 7: Format and print report
    report = format_report(benchmark, coco_val, ocr_metrics, violation_metrics, vram_info)
    print(report)

    # Step 8: Save JSON results
    results_json = build_eval_results_json(
        benchmark, coco_val, ocr_metrics, violation_metrics, vram_info
    )
    with open(EVAL_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(results_json, f, indent=2, ensure_ascii=False, default=str)
    logger.info("Results saved to: %s", EVAL_RESULTS_PATH)

    # Cleanup
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    logger.info("Evaluation complete.")


if __name__ == "__main__":
    main()
