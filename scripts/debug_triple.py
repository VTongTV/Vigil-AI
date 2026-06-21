import sys
import os
import cv2
import yaml

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager
from backend.app.core.violations import detect_triple_riding

mm = ModelManager()
mm.load_resident_models()

img_name = 'demo_triple_riding_krpuram-01.jpg'
path = 'frontend/public/demo/' + img_name
img = cv2.imread(path)
img_h, img_w = img.shape[:2]

coco_dets = mm.detect_coco(img)
persons = [d for d in coco_dets if d["class_id"] == 0]
two_wheelers = [d for d in coco_dets if d["class_id"] in [1, 3]]
print(f"Persons: {len(persons)}, Two-wheelers: {len(two_wheelers)}")

violations = detect_triple_riding(persons, two_wheelers, img_w, img_h)
print(f"Violations detected: {len(violations)}")
