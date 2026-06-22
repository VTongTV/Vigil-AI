"""Debug MARATHAHALLI triple riding — inspect all detections in detail."""
import sys, os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
from PIL import Image
from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import bbox_center

mm = ModelManager()
mm.load_resident_models()

fname = "demo_triple_riding_marathahalli-01.jpg"
path = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname)
img = Image.open(path).convert("RGB")
MAX_DIM = 1920
if max(img.size) > MAX_DIM:
    ratio = MAX_DIM / max(img.size)
    img = img.resize((int(img.size[0]*ratio), int(img.size[1]*ratio)), Image.Resampling.LANCZOS)
img_np = np.array(img)
img_h, img_w = img_np.shape[:2]
processed = preprocess_image(img_np)
coco_dets = mm.detect_coco(processed)

# Show ALL detections with positions
print(f"Image: {img_w}x{img_h}")
print(f"\nAll COCO detections:")
for d in coco_dets:
    bbox = d["bbox"]
    cx, cy = bbox_center(bbox)
    print(f"  {d['class_name']} conf={d['confidence']:.2f} center=({cx/img_w:.3f},{cy/img_h:.3f}) bbox=({bbox[0]/img_w:.3f},{bbox[1]/img_h:.3f})-({bbox[2]/img_w:.3f},{bbox[3]/img_h:.3f})")

# Show persons near motorcycles
persons = [d for d in coco_dets if d["class_id"] == 0]
motorcycles = [d for d in coco_dets if d["class_id"] == 3]

print(f"\nMotorcycles: {len(motorcycles)}")
print(f"Persons: {len(persons)}")

for i, tw in enumerate(motorcycles):
    tw_bbox = tw["bbox"]
    tw_area = (tw_bbox[2]-tw_bbox[0]) * (tw_bbox[3]-tw_bbox[1])
    print(f"\nMoto {i} conf={tw['confidence']:.2f} bbox=({tw_bbox[0]/img_w:.3f},{tw_bbox[1]/img_h:.3f})-({tw_bbox[2]/img_w:.3f},{tw_bbox[3]/img_h:.3f}) area={tw_area:.0f}")
    
    tw_h = tw_bbox[3] - tw_bbox[1]
    expanded = [
        tw_bbox[0] - tw_h * 0.10,
        tw_bbox[1] - tw_h * 0.40,
        tw_bbox[2] + tw_h * 0.10,
        tw_bbox[3],
    ]
    
    for j, p in enumerate(persons):
        p_bbox = p["bbox"]
        p_cx, p_cy = bbox_center(p_bbox)
        # Check overlap
        ix1 = max(p_bbox[0], tw_bbox[0])
        iy1 = max(p_bbox[1], tw_bbox[1])
        ix2 = min(p_bbox[2], tw_bbox[2])
        iy2 = min(p_bbox[3], tw_bbox[3])
        if ix2 > ix1 and iy2 > iy1:
            p_area = (p_bbox[2]-p_bbox[0]) * (p_bbox[3]-p_bbox[1])
            inter = (ix2-ix1) * (iy2-iy1)
            overlap_ratio = inter / p_area if p_area > 0 else 0
        else:
            overlap_ratio = 0
        
        in_expanded = expanded[0] <= p_cx <= expanded[2] and expanded[1] <= p_cy <= expanded[3]
        print(f"  Person {j} conf={p['confidence']:.2f} center=({p_cx/img_w:.3f},{p_cy/img_h:.3f}) overlap={overlap_ratio:.3f} in_expanded={in_expanded}")

# Helmet detections at lower threshold
print("\n--- Trying helmet detection with conf >= 0.05 ---")
helmet_dets = mm.detect_helmet(processed)
print(f"Helmet detections (conf >= 0.15): {len(helmet_dets)}")
for h in helmet_dets:
    h_bbox = h["bbox"]
    h_cx, h_cy = bbox_center(h_bbox)
    print(f"  {h['class_name']} conf={h['confidence']:.3f} center=({h_cx/img_w:.3f},{h_cy/img_h:.3f})")
