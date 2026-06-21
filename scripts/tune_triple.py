import cv2
import yaml
import sys
import os

sys.path.append(os.getcwd())
from backend.app.core.detector import ModelManager

mm = ModelManager()
mm.load_resident_models()

for img_name in ['demo_triple_riding_krpuram-01.jpg', 'demo_triple_riding_marathahalli-01.jpg', 'demo_triple_riding_whitefield-01.jpg']:
    path = 'frontend/public/demo/' + img_name
    img = cv2.imread(path)
    if img is None:
        continue
    img_h, img_w = img.shape[:2]

    coco_dets = mm.detect_coco(img)
    persons = [d for d in coco_dets if d["class_id"] == 0]
    two_wheelers = [d for d in coco_dets if d["class_id"] in [1, 3]]
    
    print(f"\n--- {img_name} ---")
    for tw in two_wheelers:
        tw_bbox = tw["bbox"]
        riders = []
        
        for person in persons:
            p_bbox = person["bbox"]
            
            # Horizontal center check
            p_cx = (p_bbox[0] + p_bbox[2]) / 2
            tw_cx = (tw_bbox[0] + tw_bbox[2]) / 2
            tw_w = tw_bbox[2] - tw_bbox[0]
            
            diff = abs(p_cx - tw_cx)
            margin_needed = (diff / tw_w) - 0.5
            
            # Vertical overlap check
            overlap_y1 = max(p_bbox[1], tw_bbox[1])
            overlap_y2 = min(p_bbox[3], tw_bbox[3])
            overlap_h = max(0, overlap_y2 - overlap_y1)
            person_h = p_bbox[3] - p_bbox[1]
            vert_overlap = overlap_h / person_h if person_h > 0 else 0
            
            if margin_needed < 0.35 and vert_overlap > 0.15: # very loose
                riders.append((margin_needed, vert_overlap))
                
        if len(riders) > 2:
            print(f"Found 3+ riders on a bike (loose)! count: {len(riders)}")
            for r in riders:
                print(f"  margin_needed={r[0]:.2f}, vert_overlap={r[1]:.2f}")
