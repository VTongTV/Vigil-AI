"""Debug specific failing images with full detection details."""
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
from backend.app.core.violations import point_in_polygon, bbox_center

mm = ModelManager()
mm.load_resident_models()

sl_cfg = get_violation_config("stop_line")
all_stop = sl_cfg.get("stop_line_zones", [])

# Debug SILKBOARD no_helmet
fname = "demo_no_helmet_silkboard-01.jpg"
path = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname)
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
helmet_dets = mm.detect_helmet(processed)

persons = [d for d in coco_dets if d["class_id"] == 0]
motorcycles = [d for d in coco_dets if d["class_id"] == 3]

print(f"=== {fname} ({img_w}x{img_h}) ===")
print(f"Persons: {len(persons)}, Motorcycles: {len(motorcycles)}")
print(f"Helmet detections:")
for h in helmet_dets:
    cls = h.get("class_name", "?")
    conf = h.get("confidence", 0)
    h_bbox = h["bbox"]
    h_cx, h_cy = bbox_center(h_bbox)
    print(f"  {cls} conf={conf:.3f} center=({h_cx/img_w:.3f},{h_cy/img_h:.3f})")

print(f"\nPerson-motorcycle overlap analysis:")
for i, p in enumerate(persons):
    p_bbox = p["bbox"]
    p_area = (p_bbox[2] - p_bbox[0]) * (p_bbox[3] - p_bbox[1])
    p_cx, p_cy = bbox_center(p_bbox)
    print(f"  Person {i}: conf={p['confidence']:.2f} center=({p_cx/img_w:.3f},{p_cy/img_h:.3f}) area={p_area:.0f}")
    for j, m in enumerate(motorcycles):
        m_bbox = m["bbox"]
        ix1 = max(p_bbox[0], m_bbox[0])
        iy1 = max(p_bbox[1], m_bbox[1])
        ix2 = min(p_bbox[2], m_bbox[2])
        iy2 = min(p_bbox[3], m_bbox[3])
        inter_area = max(0, ix2 - ix1) * max(0, iy2 - iy1)
        overlap_ratio = inter_area / p_area if p_area > 0 else 0
        m_cx, m_cy = bbox_center(m_bbox)
        print(f"    Moto {j}: conf={m['confidence']:.2f} center=({m_cx/img_w:.3f},{m_cy/img_h:.3f}) overlap_ratio={overlap_ratio:.3f}")
        if overlap_ratio >= 0.30:
            # Check head region overlap with helmet detections
            head_bbox = [p_bbox[0], p_bbox[1], p_bbox[2], p_bbox[1] + (p_bbox[3] - p_bbox[1]) * 0.3]
            for h in helmet_dets:
                h_bbox = h["bbox"]
                h_cx, h_cy = bbox_center(h_bbox)
                in_head = head_bbox[0] <= h_cx <= head_bbox[2] and head_bbox[1] <= h_cy <= head_bbox[3]
                print(f"      Helmet: {h['class_name']} conf={h['confidence']:.3f} in_head={in_head}")

# Debug YELAHANKA stop_line
print(f"\n=== demo_stop_line_violation_yelahanka-01.jpg ===")
fname2 = "demo_stop_line_violation_yelahanka-01.jpg"
path2 = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname2)
img2 = Image.open(path2).convert("RGB")
if max(img2.size) > MAX_DIM:
    ratio = MAX_DIM / max(img2.size)
    img2 = img2.resize(
        (int(img2.size[0] * ratio), int(img2.size[1] * ratio)),
        Image.Resampling.LANCZOS,
    )
img2_np = np.array(img2)
img2_h, img2_w = img2_np.shape[:2]
processed2 = preprocess_image(img2_np)
coco2 = mm.detect_coco(processed2)

zones = [z for z in all_stop if z.get("camera_id") == "YELAHANKA-01"]
zone = zones[0] if zones else None
poly = zone["polygon"] if zone else []
ys = [p[1] for p in poly]
xs = [p[0] for p in poly]
print(f"Zone: x {min(xs):.2f}-{max(xs):.2f}, y {min(ys):.2f}-{max(ys):.2f}")

for d in coco2:
    if d.get("class_id") in [0, 2, 3, 5, 7]:
        bbox = d["bbox"]
        cx = (bbox[0] + bbox[2]) / 2 / img2_w
        cy = (bbox[1] + bbox[3]) / 2 / img2_h
        front_cy = bbox[3] / img2_h
        front_cx = (bbox[0] + bbox[2]) / 2 / img2_w
        in_zone = point_in_polygon(front_cx, front_cy, poly) if poly else False
        print(f"  {d.get('class_name','?'):12s} conf={d['confidence']:.2f} center=({cx:.3f},{cy:.3f}) front=({front_cx:.3f},{front_cy:.3f}) IN={in_zone}")
