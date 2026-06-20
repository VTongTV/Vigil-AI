"""Debug the SILKBOARD no-helmet image detection pipeline."""
import os, sys, numpy as np
from PIL import Image

sys.path.insert(0, '.')
os.chdir('.')

from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image

mm = ModelManager()
mm.load_resident_models()

img = Image.open('frontend/public/demo/demo_no_helmet_silkboard-01.jpg').convert('RGB')
img_np = np.array(img)
h, w = img_np.shape[:2]
processed = preprocess_image(img_np)

# COCO detections
coco = mm.detect_coco(processed)
print(f'=== COCO detections ({len(coco)}) ===')
for d in coco:
    x1, y1, x2, y2 = d["bbox"]
    cx = ((x1+x2)/2)/w
    cy = ((y1+y2)/2)/h
    print(f'  class_id={d["class_id"]} ({d["class_name"]}): conf={d["confidence"]:.2f}, center=({cx:.2f},{cy:.2f})')

# Helmet detections at default threshold
helmet = mm.detect_helmet(processed)
print(f'\n=== Helmet detections at default conf ({len(helmet)}) ===')
for d in helmet:
    x1, y1, x2, y2 = d["bbox"]
    cx = ((x1+x2)/2)/w
    cy = ((y1+y2)/2)/h
    print(f'  {d["class_name"]}: conf={d["confidence"]:.3f}, center=({cx:.2f},{cy:.2f})')

# Helmet detections at very low threshold
results_low = mm.helmet_model.model.predict(processed, conf=0.01, verbose=False)
print(f'\n=== Helmet raw model output (conf=0.01) ===')
for r in results_low:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        cls_name = r.names[cls_id]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = ((x1+x2)/2)/w
        cy = ((y1+y2)/2)/h
        print(f'  {cls_name}: conf={conf:.3f}, center=({cx:.2f},{cy:.2f}), bbox=[{x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f}]')

# Check motorcycle-person association for helmet logic
motorcycles = [d for d in coco if d["class_id"] == 3]
persons = [d for d in coco if d["class_id"] == 0]
print(f'\n=== Helmet violation logic ===')
print(f'  Motorcycles: {len(motorcycles)}')
print(f'  Persons: {len(persons)}')

from backend.app.core.violations import detect_helmet_violations
violations = detect_helmet_violations(persons, motorcycles, helmet, w, h)
print(f'  Helmet violations found: {len(violations)}')
for v in violations:
    print(f'    {v}')
