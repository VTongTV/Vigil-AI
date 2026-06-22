"""Debug detection output for a single image."""
import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
from PIL import Image
from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image

mm = ModelManager()
mm.load_resident_models()

fname = sys.argv[1] if len(sys.argv) > 1 else "demo_triple_riding_marathahalli-01.jpg"
path = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname)

img = Image.open(path).convert("RGB")
MAX_DIM = 1920
if max(img.size) > MAX_DIM:
    ratio = MAX_DIM / max(img.size)
    new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
    img = img.resize(new_size, Image.Resampling.LANCZOS)

img_np = np.array(img)
h, w = img_np.shape[:2]
proc = preprocess_image(img_np)
dets = mm.detect_coco(proc)

print(f"Image: {fname} ({w}x{h})")
print(f"Total detections: {len(dets)}")

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
