import cv2
import glob
import os
import sys

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager

def add_plate(img, bbox, text="KA 01 AB 1234"):
    x1, y1, x2, y2 = map(int, bbox)
    
    # Calculate plate size based on vehicle width
    vehicle_w = x2 - x1
    vehicle_h = y2 - y1
    
    # Plate dimensions
    plate_w = int(vehicle_w * 0.3)
    plate_h = int(plate_w * 0.25)
    
    # Ensure minimum readable size
    if plate_w < 120: plate_w = 120
    if plate_h < 30: plate_h = 30
    
    # Place plate near the bottom center of the vehicle
    plate_x1 = x1 + (vehicle_w - plate_w) // 2
    plate_y1 = y2 - int(vehicle_h * 0.15) - plate_h
    
    # Check boundaries
    img_h, img_w = img.shape[:2]
    if plate_x1 < 0: plate_x1 = 0
    if plate_y1 < 0: plate_y1 = 0
    if plate_x1 + plate_w > img_w: plate_x1 = img_w - plate_w
    if plate_y1 + plate_h > img_h: plate_y1 = img_h - plate_h
    
    plate_x2 = plate_x1 + plate_w
    plate_y2 = plate_y1 + plate_h
    
    # Draw white background and black border
    cv2.rectangle(img, (plate_x1, plate_y1), (plate_x2, plate_y2), (255, 255, 255), -1)
    cv2.rectangle(img, (plate_x1, plate_y1), (plate_x2, plate_y2), (0, 0, 0), 2)
    
    # Determine font scale to fit inside plate
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.0
    thickness = 2
    
    while font_scale > 0.3:
        text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
        if text_size[0] < plate_w - 10 and text_size[1] < plate_h - 10:
            break
        font_scale -= 0.1
        
    text_x = plate_x1 + (plate_w - text_size[0]) // 2
    text_y = plate_y1 + (plate_h + text_size[1]) // 2
    
    # Draw text
    cv2.putText(img, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness, cv2.LINE_AA)
    
    return img

def main():
    mm = ModelManager()
    mm.load_resident_models()
    
    demo_dir = os.path.join("frontend", "public", "demo")
    images = glob.glob(os.path.join(demo_dir, "*.jpg"))
    
    for img_path in images:
        print(f"Processing {os.path.basename(img_path)}...")
        img = cv2.imread(img_path)
        if img is None:
            continue
            
        # Detect vehicles
        dets = mm.detect_coco(img)
        # Vehicles: car (2), motorcycle (3), bus (5), truck (7)
        vehicles = [d for d in dets if d["class_id"] in [2, 3, 5, 7]]
        
        if not vehicles:
            print("  No vehicles found, skipping plate.")
            continue
            
        # Sort by bounding box area (largest first)
        vehicles.sort(key=lambda d: (d["bbox"][2] - d["bbox"][0]) * (d["bbox"][3] - d["bbox"][1]), reverse=True)
        
        # Add plate to up to 2 largest vehicles
        for i in range(min(2, len(vehicles))):
            plate_text = f"KA 01 AB 100{i+1}"
            img = add_plate(img, vehicles[i]["bbox"], plate_text)
            
        cv2.imwrite(img_path, img)
        print("  Added plate(s).")

if __name__ == "__main__":
    main()
