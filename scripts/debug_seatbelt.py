import sys
import os
import cv2
import yaml

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager
from backend.app.core.violations import extract_windshield_crops, detect_seatbelt_violations

with open('configs/default.yaml', 'r') as f:
    cfg = yaml.safe_load(f)

mm = ModelManager()
mm.load_resident_models()

for img_name in ['demo_no_seatbelt_hebbal-01.jpg', 'demo_no_seatbelt_whitefield-01.jpg', 'demo_no_seatbelt_marathahalli-01.jpg']:
    path = 'frontend/public/demo/' + img_name
    img = cv2.imread(path)
    if img is None:
        continue
    img_h, img_w = img.shape[:2]
    
    coco_dets = mm.detect_coco(img)
    car_dets = [d for d in coco_dets if d.get("class_id") == 2]
    print(f"\n--- {img_name} ---")
    print(f"Cars detected: {len(car_dets)}")
    
    windshield_crops = extract_windshield_crops(car_dets, img, img_w, img_h)
    print(f"Windshield crops extracted: {len(windshield_crops)}")
    
    if windshield_crops:
        raw_class = mm.classify_seatbelt_on_demand([c["crop"] for c in windshield_crops])
        seatbelt_classifications = []
        for crop_info, cls_result in zip(windshield_crops, raw_class):
            print(f"Crop size: {crop_info['crop_bbox']} -> {cls_result['class_name']} ({cls_result['confidence']:.2f})")
            seatbelt_classifications.append({
                "class_name": cls_result["class_name"],
                "confidence": cls_result["confidence"],
                "car_bbox": crop_info["car_bbox"],
                "crop_bbox": crop_info["crop_bbox"],
                "crop_index": crop_info["crop_index"],
                "car_confidence": crop_info["car_confidence"],
            })
        
        violations = detect_seatbelt_violations(car_dets, seatbelt_classifications, img_w, img_h)
        print(f"Violations detected: {len(violations)}")
