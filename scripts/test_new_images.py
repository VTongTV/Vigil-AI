"""Quick test for newly added demo images."""

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
    extract_windshield_crops,
)

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
    """Extract camera_id from demo filename."""
    base = fname.replace("demo_", "").replace("-01.jpg", "").replace("-02.jpg", "")
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
    """Filter polygons by camera_id."""
    return [p for p in polygons if p.get("camera_id", cam_id) == cam_id]


def main() -> None:
    """Test newly added demo images."""
    mm = ModelManager()
    mm.load_resident_models()
    print("Models loaded\n")

    ws_cfg = get_violation_config("wrong_side")
    ip_cfg = get_violation_config("illegal_parking")
    sl_cfg = get_violation_config("stop_line")
    rl_cfg = get_violation_config("red_light")

    all_lanes = ws_cfg.get("lane_polygons", [])
    all_parking = ip_cfg.get("zone_polygons", [])
    all_stop = sl_cfg.get("stop_line_zones", [])

    demo_dir = os.path.join(PROJECT_ROOT, "frontend", "public", "demo")

    # Test ALL images
    all_images = sorted(f for f in os.listdir(demo_dir) if f.endswith(".jpg"))

    passed = 0
    failed = 0

    for fname in all_images:
        exp = expected_violation(fname)
        if exp is None:
            continue

        cam_id = camera_id_from_filename(fname)
        path = os.path.join(demo_dir, fname)

        img = Image.open(path).convert("RGB")
        img_np = np.array(img)
        img_h, img_w = img_np.shape[:2]

        t0 = time.time()
        processed = preprocess_image(img_np)
        coco_dets = mm.detect_coco(processed)
        helmet_dets = mm.detect_helmet(processed)

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

        vtypes = [v["type"] for v in violations]
        detected = exp in vtypes
        status = "PASS" if detected else "FAIL"

        if detected:
            passed += 1
        else:
            failed += 1

        matched = [v for v in violations if v["type"] == exp]
        conf = f"{matched[0]['confidence']:.3f}" if matched else "N/A"

        print(f"[{status}] {fname} ({elapsed:.1f}s)")
        print(f"  Camera: {cam_id}, Size: {img_w}x{img_h}")
        print(f"  Expected: {exp}, Confidence: {conf}")
        print(f"  All violations: {vtypes or 'none'}")
        print(f"  COCO: {len(coco_dets)}, Helmet: {len(helmet_dets)}, Cars: {len(car_dets)}")

        seatbelt_summary = [
            (s["class_name"], round(s["confidence"], 2))
            for s in seatbelt_classifications
        ]
        print(f"  Seatbelt cls: {seatbelt_summary}")
        print(f"  Zones: lanes={len(filtered_lanes)}, parking={len(filtered_parking)}, stop={len(filtered_stop)}")

        if not detected:
            coco_summary = [
                (d.get("class_name", "?"), round(d.get("confidence", 0), 2))
                for d in coco_dets[:10]
            ]
            print(f"  COCO details: {coco_summary}")
            helmet_summary = [
                (d.get("class_name", "?"), round(d.get("confidence", 0), 2))
                for d in helmet_dets[:10]
            ]
            print(f"  Helmet details: {helmet_summary}")

            # For stop_line / red_light, show vehicle positions
            vehicles_in_zone = []
            for d in coco_dets:
                if d.get("class_id") in [2, 3, 5, 7]:  # car, motorcycle, bus, truck
                    cx = (d["bbox"][0] + d["bbox"][2]) / 2 / img_w
                    cy = (d["bbox"][1] + d["bbox"][3]) / 2 / img_h
                    vehicles_in_zone.append(
                        (d.get("class_name", "?"), round(cx, 3), round(cy, 3), round(d.get("confidence", 0), 2))
                    )
            if vehicles_in_zone:
                print(f"  Vehicle positions (cx, cy, conf): {vehicles_in_zone}")

        print()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    print(f"RESULT: {passed}/{passed + failed} passed, {failed}/{passed + failed} failed")


if __name__ == "__main__":
    main()
