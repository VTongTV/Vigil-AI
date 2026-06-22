"""Debug helmet detections for failing no-helmet images."""
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

# Test no-helmet images
test_images = [
    "demo_no_helmet_hebbal-01.jpg",
    "demo_no_helmet_mgroad-01.jpg",
    "demo_no_helmet_silkboard-01.jpg",
]

for fname in test_images:
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

    # Find persons near motorcycles
    persons = [d for d in coco_dets if d["class_id"] == 0]
    motorcycles = [d for d in coco_dets if d["class_id"] == 3]

    print(f"\n=== {fname} ({img_w}x{img_h}) ===")
    print(f"  Persons: {len(persons)}, Motorcycles: {len(motorcycles)}")
    print(f"  Helmet detections (conf>=0.25): {len(helmet_dets)}")
    for h in helmet_dets:
        cls = h.get("class_name", "?")
        conf = h.get("confidence", 0)
        print(f"    {cls} conf={conf:.3f}")

    # Try with lower conf threshold
    from ultralytics import YOLO
    helmet_model = YOLO(os.path.join(PROJECT_ROOT, "weights", "helmet.pt"))
    low_conf_dets = helmet_model.predict(processed, conf=0.10, verbose=False)
    print(f"  Helmet detections (conf>=0.10):")
    for result in low_conf_dets:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            cls_name = result.names[cls_id]
            conf = float(box.conf[0])
            print(f"    {cls_name} conf={conf:.3f}")
