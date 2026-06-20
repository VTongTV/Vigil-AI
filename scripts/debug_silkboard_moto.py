"""Debug: check COCO motorcycle detection at lower thresholds."""
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

# Try progressively lower COCO thresholds
for conf in [0.20, 0.15, 0.10, 0.05]:
    results = mm.coco_model.model.predict(processed, conf=conf, verbose=False)
    motos = 0
    persons = 0
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            if cls_id == 3:
                motos += 1
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cx = ((x1+x2)/2)/w
                cy = ((y1+y2)/2)/h
                cf = float(box.conf[0])
                print(f'  conf={conf:.2f}: motorcycle at ({cx:.2f},{cy:.2f}), conf={cf:.3f}')
            if cls_id == 0:
                persons += 1
    print(f'  COCO conf={conf:.2f}: motorcycles={motos}, persons={persons}')
