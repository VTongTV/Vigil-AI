"""Debug all motorcycles with head search for KRPURAM."""
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

fname = "demo_triple_riding_krpuram-01.jpg"
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
helmet_dets = mm.detect_helmet(processed)

motorcycles = [d for d in coco_dets if d["class_id"] == 3]

for i, tw in enumerate(motorcycles):
    tw_bbox = tw["bbox"]
    tw_h = tw_bbox[3] - tw_bbox[1]
    head_search = [
        tw_bbox[0], tw_bbox[1] - tw_h * 0.40,
        tw_bbox[2], tw_bbox[3],
    ]
    heads_in = []
    for h in helmet_dets:
        h_bbox = h["bbox"]
        h_cx, h_cy = bbox_center(h_bbox)
        if head_search[0] <= h_cx <= head_search[2] and head_search[1] <= h_cy <= head_search[3]:
            heads_in.append(h)
    print(f"Moto {i} conf={tw['confidence']:.2f} bbox=({tw_bbox[0]/img_w:.3f},{tw_bbox[1]/img_h:.3f})-({tw_bbox[2]/img_w:.3f},{tw_bbox[3]/img_h:.3f}) heads_in_region={len(heads_in)}")
    for h in heads_in:
        h_cx, h_cy = bbox_center(h["bbox"])
        print(f"  {h['class_name']} conf={h['confidence']:.3f} center=({h_cx/img_w:.3f},{h_cy/img_h:.3f})")
