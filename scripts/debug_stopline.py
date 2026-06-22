"""Debug stop-line zone positions vs vehicle detections."""
import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
from PIL import Image

from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image
from backend.app.config import get_violation_config
from backend.app.core.violations import point_in_polygon

mm = ModelManager()
mm.load_resident_models()

sl_cfg = get_violation_config("stop_line")
all_stop = sl_cfg.get("stop_line_zones", [])

# Test each stop-line image
test_images = [
    ("demo_stop_line_violation_electronic-01.jpg", "ELECTRONIC-01"),
    ("demo_stop_line_violation_krpuram-01.jpg", "KRPURAM-01"),
    ("demo_stop_line_violation_yelahanka-01.jpg", "YELAHANKA-01"),
    ("demo_red_light_violation_hebbal-01.jpg", "HEBBAL-01"),
    ("demo_red_light_violation_mgroad-01.jpg", "MGROAD-01"),
    ("demo_red_light_violation_silkboard-01.jpg", "SILKBOARD-01"),
]

for fname, cam_id in test_images:
    path = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname)
    if not os.path.exists(path):
        print(f"SKIP: {fname} not found")
        continue

    img = Image.open(path).convert("RGB")
    MAX_DIM = 1920
    if max(img.size) > MAX_DIM:
        ratio = MAX_DIM / max(img.size)
        img = img.resize(
            (int(img.size[0] * ratio), int(img.size[1] * ratio)),
            Image.Resampling.LANCZOS,
        )
    img_np = np.array(img)
    img_h, img_w = img_np.shape[:2]

    processed = preprocess_image(img_np)
    coco_dets = mm.detect_coco(processed)

    # Get stop zones for this camera
    zones = [z for z in all_stop if z.get("camera_id", cam_id) == cam_id]
    zone = zones[0] if zones else None
    poly = zone["polygon"] if zone else []

    print(f"\n=== {fname} ({img_w}x{img_h}) ===")
    if zone:
        ys = [p[1] for p in poly]
        xs = [p[0] for p in poly]
        print(f"  Zone: x {min(xs):.2f}-{max(xs):.2f}, y {min(ys):.2f}-{max(ys):.2f}")

    # Show all vehicles with bottom-edge position
    for d in coco_dets:
        if d.get("class_id") in [2, 3, 5, 7]:
            bbox = d["bbox"]
            cx = (bbox[0] + bbox[2]) / 2 / img_w
            cy = (bbox[1] + bbox[3]) / 2 / img_h
            front_cy = bbox[3] / img_h
            front_cx = (bbox[0] + bbox[2]) / 2 / img_w
            in_zone = False
            if zone and poly:
                in_zone = point_in_polygon(front_cx, front_cy, poly)
            cls = d.get("class_name", "?")
            print(
                f"  {cls:12s} conf={d['confidence']:.2f} "
                f"center=({cx:.3f},{cy:.3f}) front=({front_cx:.3f},{front_cy:.3f}) "
                f"IN_ZONE={in_zone}"
            )
