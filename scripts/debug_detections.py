"""Debug detection output for a single image."""
import sys
import os
import argparse

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
from PIL import Image
from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image

parser = argparse.ArgumentParser()
parser.add_argument("image", nargs="?", default="demo_triple_riding_marathahalli-01.jpg")
parser.add_argument("--no-resize", action="store_true", help="Skip resize (test full resolution)")
args = parser.parse_args()

mm = ModelManager()
mm.load_resident_models()

fname = args.image
path = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname)

img = Image.open(path).convert("RGB")
if not args.no_resize:
    MAX_DIM = 1920
    if max(img.size) > MAX_DIM:
        ratio = MAX_DIM / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
        print(f"Resized to {img.size}")

img_np = np.array(img)
h, w = img_np.shape[:2]

# Test with lower confidence threshold
from backend.app.config import get_config
config = get_config()
models_cfg = config.get("models", {})
coco_cfg = models_cfg.get("coco", {})

# Temporarily lower threshold
original_conf = coco_cfg.get("conf_threshold", 0.15)
mm_low = ModelManager()
mm_low.load_resident_models()

proc = preprocess_image(img_np)
print(f"Image: {fname} ({w}x{h})")

# Run with default threshold
dets = mm_low.detect_coco(proc)
print(f"Total detections (conf>={original_conf}): {len(dets)}")

persons = [d for d in dets if d.get("class_id") == 0]
motos = [d for d in dets if d.get("class_id") == 3]

for p in persons:
    b = p["bbox"]
    cx = ((b[0] + b[2]) / 2) / w
    cy = ((b[1] + b[3]) / 2) / h
    print(f"  Person conf={p['confidence']:.2f} cx={cx:.3f} cy={cy:.3f}")

for m in motos:
    b = m["bbox"]
    cx = ((b[0] + b[2]) / 2) / w
    cy = ((b[1] + b[3]) / 2) / h
    print(f"  Moto  conf={m['confidence']:.2f} cx={cx:.3f} cy={cy:.3f}")
