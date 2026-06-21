import cv2
import sys
import os

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager
from backend.app.core.ocr import recognize_plate, postprocess_plate

mm = ModelManager()
img = cv2.imread("synthetic_plate.jpg")
plate_dets = mm.detect_plate_on_demand(img)

if plate_dets:
    bbox = plate_dets[0]["bbox"]
    x1, y1, x2, y2 = map(int, bbox)
    crop = img[y1:y2, x1:x2]
    res = recognize_plate(crop)
    if res:
        text, conf = res
        print(f"RAW OCR: {text}")
        print(f"Postprocessed: {postprocess_plate(text)}")
