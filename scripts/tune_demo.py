import sys
import os
import glob
sys.path.append('D:\\Web Project\\Flipkart\\Round 2')

from backend.app.core.detector import ModelManager
from backend.app.core.violations import detect_all_violations
from backend.app.config import get_violation_config
import cv2

model_manager = ModelManager()
model_manager.load_resident_models()

# Load default config for polygons
import yaml
with open('D:\\Web Project\\Flipkart\\Round 2\\configs\\default.yaml', 'r') as f:
    cfg = yaml.safe_load(f)

lane_polygons = cfg.get('violations', {}).get('wrong_side', {}).get('lane_polygons', [])
no_parking_zones = cfg.get('violations', {}).get('illegal_parking', {}).get('zone_polygons', [])
stop_line_zones = cfg.get('violations', {}).get('stop_line', {}).get('stop_line_zones', [])

demo_dir = 'D:\\Web Project\\Flipkart\\Round 2\\frontend\\public\\demo\\'
image_paths = glob.glob(os.path.join(demo_dir, '*.jpg'))

print(f"Testing {len(image_paths)} images...")

for img_path in image_paths:
    img_name = os.path.basename(img_path)
    img = cv2.imread(img_path)
    if img is None:
        print(f"Failed to load {img_name}")
        continue
        
    img_h, img_w, _ = img.shape
    
    # Expected violation from filename
    expected_violation = None
    if "no_helmet" in img_name: expected_violation = "no_helmet"
    elif "no_seatbelt" in img_name: expected_violation = "no_seatbelt"
    elif "triple_riding" in img_name: expected_violation = "triple_riding"
    elif "wrong_side" in img_name: expected_violation = "wrong_side_driving"
    elif "illegal_parking" in img_name: expected_violation = "illegal_parking"
    elif "stop_line" in img_name: expected_violation = "stop_line_violation"
    elif "red_light" in img_name: expected_violation = "red_light_violation"
    
    coco_detections = model_manager.detect_coco(img)
    helmet_detections = model_manager.detect_helmet(img)
    
    seatbelt_classifications = []
    from backend.app.core.violations import extract_windshield_crops
    car_dets = [d for d in coco_detections if d.get("class_id") == 2]
    if car_dets:
        windshield_crops = extract_windshield_crops(
            car_dets, img, img_w, img_h,
        )
        if windshield_crops:
            raw_classifications = model_manager.classify_seatbelt_on_demand(
                [c["crop"] for c in windshield_crops],
            )
            for crop_info, cls_result in zip(windshield_crops, raw_classifications):
                seatbelt_classifications.append({
                    "class_name": cls_result["class_name"],
                    "confidence": cls_result["confidence"],
                    "car_bbox": crop_info["car_bbox"],
                    "crop_bbox": crop_info["crop_bbox"],
                    "crop_index": crop_info["crop_index"],
                    "car_confidence": crop_info["car_confidence"],
                })
    
    # Extract camera ID from filename: demo_wrong_side_driving_bannerghatta-01.jpg -> BANNERGHATTA-01
    parts = img_name.split('_')
    cam_part = parts[-1].split('.')[0]
    camera_id = cam_part.upper()
    
    def filter_polygons(polygons):
        return [p for p in polygons if p.get("camera_id", camera_id) == camera_id]

    violations = detect_all_violations(
        coco_detections=coco_detections,
        helmet_detections=helmet_detections,
        img_w=img_w,
        img_h=img_h,
        lane_polygons=filter_polygons(lane_polygons),
        no_parking_zones=filter_polygons(no_parking_zones),
        stop_line_zones=filter_polygons(stop_line_zones),
        signal_state="red" if expected_violation == "red_light_violation" else "unknown",
        seatbelt_detections=seatbelt_classifications
    )
    
    actual_types = [v['type'] for v in violations]
    has_expected = expected_violation in actual_types
    
    status = "PASS" if has_expected else "FAIL"
    print(f"[{status}] {img_name}")
    print(f"    Expected: {expected_violation}")
    print(f"    Actual:   {actual_types}")
    if not has_expected:
        print(f"    -> COCO detected {len(coco_detections)} objects, Helmet detected {len(helmet_detections)} objects.")
        
print("Done.")
