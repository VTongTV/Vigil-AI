"""Validate heuristic violations with bounded zone polygons.

Runs the full pipeline on demo images to verify that wrong-side,
illegal-parking, and stop-line heuristics no longer produce false
positives from full-frame zone polygons.

Usage:
    python scripts/validate_heuristics.py
"""

import os
import sys
from collections import Counter

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
import torch
from PIL import Image

from backend.app.config import (
    get_model_config,
    get_violation_config,
)
from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import detect_all_violations


def main() -> None:
    """Run heuristic validation on all demo images."""
    mm = ModelManager()
    mm.load_resident_models()

    demo_dir = os.path.join(PROJECT_ROOT, "frontend", "public", "demo")
    if not os.path.isdir(demo_dir):
        print(f"Demo directory not found: {demo_dir}")
        return

    # Load zone configs
    ws_cfg = get_violation_config("wrong_side")
    ip_cfg = get_violation_config("illegal_parking")
    sl_cfg = get_violation_config("stop_line")

    lane_polygons = ws_cfg.get("lane_polygons", [])
    no_parking_zones = ip_cfg.get("zone_polygons", [])
    stop_line_zones = sl_cfg.get("stop_line_zones", [])

    print("=" * 60)
    print("HEURISTIC VALIDATION - Zone polygon coverage")
    print("=" * 60)
    print(f"  Wrong-side polygons: {len(lane_polygons)}")
    for p in lane_polygons:
        pts = p["polygon"]
        xs = [pt[0] for pt in pts]
        ys = [pt[1] for pt in pts]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        print(f"    {p['id']}: area={area:.2f} ({min(xs):.2f},{min(ys):.2f})-({max(xs):.2f},{max(ys):.2f})")

    print(f"  Illegal-parking polygons: {len(no_parking_zones)}")
    for p in no_parking_zones:
        pts = p["polygon"]
        xs = [pt[0] for pt in pts]
        ys = [pt[1] for pt in pts]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        print(f"    {p['id']}: area={area:.2f} ({min(xs):.2f},{min(ys):.2f})-({max(xs):.2f},{max(ys):.2f})")

    print(f"  Stop-line polygons: {len(stop_line_zones)}")
    for p in stop_line_zones:
        pts = p["polygon"]
        xs = [pt[0] for pt in pts]
        ys = [pt[1] for pt in pts]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        print(f"    {p['id']}: area={area:.2f} ({min(xs):.2f},{min(ys):.2f})-({max(xs):.2f},{max(ys):.2f})")

    print()
    print("=" * 60)
    print("HEURISTIC VALIDATION - Per-image violation counts")
    print("  (polygons filtered by camera_id, matching the API route)")
    print("=" * 60)

    all_images = sorted(f for f in os.listdir(demo_dir) if f.endswith(".jpg"))

    heuristic_types = {"wrong_side_driving", "illegal_parking", "stop_line_violation", "red_light_violation"}
    total_heuristic = 0

    for fname in all_images:
        # Determine camera_id from filename
        # e.g. demo_illegal_parking_kormangala-01.jpg -> KORMANGALA-01
        parts = fname.replace("demo_", "").replace("-01.jpg", "").split("_")
        location = parts[-1].upper()
        camera_id = f"{location}-01"

        path = os.path.join(demo_dir, fname)
        img = Image.open(path).convert("RGB")
        img_np = np.array(img)
        img_h, img_w = img_np.shape[:2]

        processed = preprocess_image(img_np)
        coco_dets = mm.detect_coco(processed)
        helmet_dets = mm.detect_helmet(processed)

        # Filter polygons by camera_id (matches the API route logic)
        def filter_by_camera(polygons: list, cam_id: str) -> list:
            return [p for p in polygons if p.get("camera_id", cam_id) == cam_id]

        filtered_lanes = filter_by_camera(lane_polygons, camera_id)
        filtered_parking = filter_by_camera(no_parking_zones, camera_id)
        filtered_stop = filter_by_camera(stop_line_zones, camera_id)

        violations = detect_all_violations(
            coco_detections=coco_dets,
            helmet_detections=helmet_dets,
            img_w=img_w,
            img_h=img_h,
            lane_polygons=filtered_lanes,
            no_parking_zones=filtered_parking,
            stop_line_zones=filtered_stop,
            signal_state="unknown",
            seatbelt_detections=[],
        )

        vtypes = Counter(v["type"] for v in violations)
        heuristic_violations = {k: v for k, v in vtypes.items() if k in heuristic_types}
        total_heuristic += sum(heuristic_violations.values())

        # Show all violations for this image
        vtype_str = ", ".join(f"{k}={v}" for k, v in sorted(vtypes.items())) or "none"
        print(f"  {fname} [{camera_id}]: {vtype_str}")

        # Warn about unexpected heuristic fires
        for hv_type, hv_count in heuristic_violations.items():
            # Parking violations should only fire on parking images
            if hv_type == "illegal_parking" and "illegal_parking" not in fname:
                print(f"    WARNING: unexpected {hv_type} on non-parking image!")
            if hv_type == "wrong_side_driving" and "wrong_side" not in fname:
                print(f"    WARNING: unexpected {hv_type} on non-wrong-side image!")
            if hv_type == "stop_line_violation" and "stop_line" not in fname:
                print(f"    NOTE: {hv_type} fired (expected only on stop-line images)")

    print()
    print(f"Total heuristic violations across all images: {total_heuristic}")

    # Cleanup
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    print()
    print("Validation complete.")


if __name__ == "__main__":
    main()
