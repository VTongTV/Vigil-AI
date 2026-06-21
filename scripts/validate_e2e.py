"""End-to-end validation: every demo image must produce its expected violation.

Runs the full pipeline (COCO + helmet + seatbelt + heuristics) on each
demo image and checks that the violation type encoded in the filename
is actually detected.

Usage:
    python scripts/validate_e2e.py [--verbose]
"""

import argparse
import os
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
import torch
from PIL import Image

from backend.app.config import get_violation_config
from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import (
    detect_all_violations,
    detect_seatbelt_violations,
    extract_windshield_crops,
)

# Mapping: filename prefix → expected violation type
FILENAME_TO_VIOLATION = {
    "demo_no_helmet": "no_helmet",
    "demo_triple_riding": "triple_riding",
    "demo_wrong_side_driving": "wrong_side_driving",
    "demo_illegal_parking": "illegal_parking",
    "demo_no_seatbelt": "no_seatbelt",
    "demo_stop_line_violation": "stop_line_violation",
    "demo_red_light_violation": "red_light_violation",
}


def camera_id_from_filename(fname: str) -> str:
    """Extract camera_id from demo filename.

    e.g. demo_illegal_parking_kormangala-01.jpg → KORMANGALA-01
    """
    # Remove demo_ prefix and -01.jpg suffix
    base = fname.replace("demo_", "").replace("-01.jpg", "").replace("-02.jpg", "")
    # Last underscore-separated token is the location
    parts = base.split("_")
    location = parts[-1].upper()
    return f"{location}-01"


def expected_violation(fname: str) -> str | None:
    """Return the expected violation type from filename."""
    for prefix, vtype in FILENAME_TO_VIOLATION.items():
        if fname.startswith(prefix):
            return vtype
    return None


def filter_by_camera(polygons: list, cam_id: str) -> list:
    """Filter polygons by camera_id, matching the API route logic."""
    return [p for p in polygons if p.get("camera_id", cam_id) == cam_id]


def main() -> None:
    """Run E2E validation on all demo images."""
    parser = argparse.ArgumentParser(description="E2E demo image validation")
    parser.add_argument("--verbose", action="store_true", help="Show all violations per image")
    args = parser.parse_args()

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
    rl_cfg = get_violation_config("red_light")

    all_lanes = ws_cfg.get("lane_polygons", [])
    all_parking = ip_cfg.get("zone_polygons", [])
    all_stop = sl_cfg.get("stop_line_zones", [])

    all_images = sorted(f for f in os.listdir(demo_dir) if f.endswith(".jpg"))

    results: list[dict] = []
    total = 0
    passed = 0
    failed = 0

    print("=" * 72)
    print("E2E VALIDATION — Demo images vs expected violation types")
    print("=" * 72)
    print()

    for fname in all_images:
        total += 1
        exp = expected_violation(fname)
        cam_id = camera_id_from_filename(fname)

        path = os.path.join(demo_dir, fname)
        img = Image.open(path).convert("RGB")
        img_np = np.array(img)
        img_h, img_w = img_np.shape[:2]

        # --- Run pipeline ---
        t0 = time.time()
        processed = preprocess_image(img_np)
        coco_dets = mm.detect_coco(processed)
        helmet_dets = mm.detect_helmet(processed)

        # Seatbelt pipeline (on-demand)
        seatbelt_classifications = []
        car_dets = [d for d in coco_dets if d.get("class_id") == 2]
        if car_dets:
            windshield_crops = extract_windshield_crops(
                car_dets, processed, img_w, img_h,
            )
            if windshield_crops:
                raw_cls = mm.classify_seatbelt_on_demand(
                    [c["crop"] for c in windshield_crops],
                )
                for crop_info, cls_result in zip(windshield_crops, raw_cls):
                    seatbelt_classifications.append({
                        "class_name": cls_result["class_name"],
                        "confidence": cls_result["confidence"],
                        "car_bbox": crop_info["car_bbox"],
                        "crop_bbox": crop_info["crop_bbox"],
                        "crop_index": crop_info["crop_index"],
                        "car_confidence": crop_info["car_confidence"],
                    })

        # Filter polygons by camera
        filtered_lanes = filter_by_camera(all_lanes, cam_id)
        filtered_parking = filter_by_camera(all_parking, cam_id)
        filtered_stop = filter_by_camera(all_stop, cam_id)

        violations = detect_all_violations(
            coco_detections=coco_dets,
            helmet_detections=helmet_dets,
            img_w=img_w,
            img_h=img_h,
            lane_polygons=filtered_lanes,
            no_parking_zones=filtered_parking,
            stop_line_zones=filtered_stop,
            signal_state=rl_cfg.get("signal_state", "unknown"),
            seatbelt_detections=seatbelt_classifications,
        )
        elapsed = time.time() - t0

        # --- Check result ---
        vtypes = [v["type"] for v in violations]
        detected = exp in vtypes if exp else True
        status = "PASS" if detected else "FAIL"

        if detected:
            passed += 1
        else:
            failed += 1

        # Collect other violations (not the expected one)
        other = [v for v in vtypes if v != exp]
        other_summary = ", ".join(other) if other else "—"

        # Find the matching violation details
        matched = [v for v in violations if v["type"] == exp]

        result_line = (
            f"  [{status}] {fname}"
            f"\n       Expected: {exp}"
            f"\n       Found:    {matched[0]['confidence']:.3f}" if matched else ""
        )
        if not detected:
            result_line = (
                f"  [{status}] {fname}"
                f"\n       Expected: {exp} — NOT DETECTED"
                f"\n       Got:      {other_summary or 'no violations'}"
            )

        print(result_line)

        if args.verbose:
            print(f"       Camera: {cam_id}, Time: {elapsed:.2f}s")
            print(f"       COCO: {len(coco_dets)}, Helmet: {len(helmet_dets)}, Cars: {len(car_dets)}")
            seatbelt_summary = [(s["class_name"], round(s["confidence"], 2)) for s in seatbelt_classifications]
            print(f"       Seatbelt classifications: {seatbelt_summary}")
            print(f"       Zone filters: lanes={len(filtered_lanes)}, parking={len(filtered_parking)}, stop={len(filtered_stop)}")
            print(f"       All violations: {vtypes}")

        results.append({
            "file": fname,
            "expected": exp,
            "detected": detected,
            "confidence": matched[0]["confidence"] if matched else None,
            "other_violations": other,
            "elapsed_s": elapsed,
        })

        print()

    # Cleanup
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    # --- Summary ---
    print("=" * 72)
    print(f"SUMMARY: {passed}/{total} passed, {failed}/{total} failed")
    print("=" * 72)

    if failed > 0:
        print()
        print("FAILED images:")
        for r in results:
            if not r["detected"]:
                print(f"  {r['file']}: expected {r['expected']}, got {r['other_violations'] or 'nothing'}")
        print()
        print("Tuning recommendations:")
        for r in results:
            if not r["detected"]:
                vtype = r["expected"]
                if vtype == "no_helmet":
                    print(f"  {r['file']}: Lower helmet conf threshold or adjust head_fraction/iou_threshold")
                elif vtype == "triple_riding":
                    print(f"  {r['file']}: Lower person conf threshold or adjust overlap/iou params")
                elif vtype == "wrong_side_driving":
                    print(f"  {r['file']}: Check camera_id matching and polygon coverage")
                elif vtype == "illegal_parking":
                    print(f"  {r['file']}: Check camera_id matching and parking zone polygon")
                elif vtype == "no_seatbelt":
                    print(f"  {r['file']}: Check windshield crop and classifier output")
                elif vtype == "stop_line_violation":
                    print(f"  {r['file']}: Check camera_id matching and stop-line zone polygon")

    print()
    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
