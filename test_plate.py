import cv2
import sys
import os

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager
from backend.app.core.ocr import process_plates

mm = ModelManager()
# We just need the plate model, which is loaded on demand
img_path = r'C:\Users\Vedant\.gemini\antigravity\brain\7c52cf62-37f5-4183-8eea-4a0daabc0c5b\test_plate_car_1781980581714.png'
img = cv2.imread(img_path)
if img is None:
    print("Failed to load image")
    sys.exit(1)

img_h, img_w = img.shape[:2]

print("Running plate detection...")
plate_dets = mm.detect_plate_on_demand(img)
print(f"Detected {len(plate_dets)} plates")

if plate_dets:
    print("Running OCR...")
    plate_results = process_plates(img, plate_dets, img_w, img_h)
    print("OCR Results:")
    for res in plate_results:
        print(f"  - Text: {res['text']} (Confidence: {res['confidence']:.2f})")
else:
    print("No plates detected to run OCR on.")
