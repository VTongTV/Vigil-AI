"""Validate seatbelt detection on demo images.

Runs the full COCO + seatbelt pipeline on demo images to verify
that the classifier produces reasonable results.

Usage:
    python scripts/validate_seatbelt.py
"""

import os
import sys

# Ensure project root is on path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
import torch
from PIL import Image

from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import (
    detect_seatbelt_violations,
    extract_windshield_crops,
)


def main() -> None:
    """Run seatbelt validation on demo images."""
    mm = ModelManager()
    mm.load_resident_models()

    demo_dir = os.path.join(PROJECT_ROOT, "frontend", "public", "demo")
    if not os.path.isdir(demo_dir):
        print(f"Demo directory not found: {demo_dir}")
        return

    # --- Seatbelt demo images ---
    seatbelt_images = sorted(
        f for f in os.listdir(demo_dir) if "no_seatbelt" in f
    )
    print("=" * 60)
    print("SEATBELT VALIDATION - Seatbelt demo images")
    print("=" * 60)

    for fname in seatbelt_images:
        path = os.path.join(demo_dir, fname)
        img = Image.open(path).convert("RGB")
        img_np = np.array(img)
        img_h, img_w = img_np.shape[:2]

        processed = preprocess_image(img_np)
        coco_results = mm.detect_coco(processed)
        car_boxes = [r for r in coco_results if r.get("class_id") == 2]

        if not car_boxes:
            print(f"  {fname}: No cars detected")
            continue

        # Extract windshield crops
        windshield_crops = extract_windshield_crops(
            car_boxes, processed, img_w, img_h,
        )

        # Run seatbelt classifier on-demand
        seatbelt_classifications = []
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

        # Run violation detection
        violations = detect_seatbelt_violations(
            car_boxes, seatbelt_classifications, img_w, img_h,
        )

        print(
            f"  {fname}: {len(car_boxes)} cars, "
            f"{len(windshield_crops)} crops, "
            f"{len(violations)} seatbelt violations"
        )
        for cls_info in seatbelt_classifications:
            print(
                f"    classifier: class={cls_info['class_name']}, "
                f"conf={cls_info['confidence']:.3f}"
            )
        for v in violations:
            print(
                f"    violation: type={v['type']}, "
                f"conf={v['confidence']:.3f}"
            )

    # --- False positive check on non-seatbelt images ---
    print()
    print("=" * 60)
    print("SEATBELT VALIDATION - False positive check")
    print("=" * 60)

    other_images = sorted(
        f
        for f in os.listdir(demo_dir)
        if "no_seatbelt" not in f and f.endswith(".jpg")
    )[:4]

    for fname in other_images:
        path = os.path.join(demo_dir, fname)
        img = Image.open(path).convert("RGB")
        img_np = np.array(img)
        img_h, img_w = img_np.shape[:2]

        processed = preprocess_image(img_np)
        coco_results = mm.detect_coco(processed)
        car_boxes = [r for r in coco_results if r.get("class_id") == 2]

        if not car_boxes:
            print(f"  {fname}: No cars detected (no FP possible)")
            continue

        windshield_crops = extract_windshield_crops(
            car_boxes, processed, img_w, img_h,
        )

        seatbelt_classifications = []
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

        violations = detect_seatbelt_violations(
            car_boxes, seatbelt_classifications, img_w, img_h,
        )
        status = "OK" if len(violations) == 0 else "FP!"
        print(
            f"  {fname}: {len(car_boxes)} cars, "
            f"{len(violations)} seatbelt violations [{status}]"
        )

    # Cleanup
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    print()
    print("Validation complete.")


if __name__ == "__main__":
    main()
