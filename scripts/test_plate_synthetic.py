import cv2
import numpy as np
import sys
import os

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager
from backend.app.core.ocr import process_plates

# Generate a synthetic image representing a car with a clear Indian license plate
img_h, img_w = 480, 640
img = np.full((img_h, img_w, 3), 100, dtype=np.uint8) # Gray background

# Draw a white rectangle for the plate
plate_x1, plate_y1, plate_x2, plate_y2 = 200, 200, 440, 260
cv2.rectangle(img, (plate_x1, plate_y1), (plate_x2, plate_y2), (255, 255, 255), -1)

# Add text to the plate (black)
text = "KA 01 AB 1234"
font = cv2.FONT_HERSHEY_SIMPLEX
font_scale = 1.0
thickness = 3
text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]

text_x = plate_x1 + (plate_x2 - plate_x1 - text_size[0]) // 2
text_y = plate_y1 + (plate_y2 - plate_y1 + text_size[1]) // 2

cv2.putText(img, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)

# Draw a black border around the plate
cv2.rectangle(img, (plate_x1, plate_y1), (plate_x2, plate_y2), (0, 0, 0), 2)

# Save the synthetic image
cv2.imwrite("synthetic_plate.jpg", img)
print("Saved synthetic_plate.jpg")

mm = ModelManager()

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
