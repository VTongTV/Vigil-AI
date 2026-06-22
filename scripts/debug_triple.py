"""Debug triple riding head counting for KRPURAM."""
import sys, os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
from PIL import Image
from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image
from backend.app.core.violations import bbox_center

mm = ModelManager()
mm.load_resident_models()

for fname in ["demo_triple_riding_krpuram-01.jpg", "demo_triple_riding_marathahalli-01.jpg"]:
    path = os.path.join(PROJECT_ROOT, "frontend", "public", "demo", fname)
    img = Image.open(path).convert("RGB")
    MAX_DIM = 1920
    if max(img.size) > MAX_DIM:
        ratio = MAX_DIM / max(img.size)
        img = img.resize((int(img.size[0]*ratio), int(img.size[1]*ratio)), Image.Resampling.LANCZOS)
    img_np = np.array(img)
    img_h, img_w = img_np.shape[:2]
    processed = preprocess_image(img_np)
    coco_dets = mm.detect_coco(processed)
    helmet_dets = mm.detect_helmet(processed)
    
    motorcycles = [d for d in coco_dets if d["class_id"] == 3]
    persons = [d for d in coco_dets if d["class_id"] == 0]
    
    print(f"\n=== {fname} ({img_w}x{img_h}) ===")
    print(f"Helmet detections:")
    for h in helmet_dets:
        h_bbox = h["bbox"]
        h_cx, h_cy = bbox_center(h_bbox)
        print(f"  {h['class_name']} conf={h['confidence']:.3f} center=({h_cx/img_w:.3f},{h_cy/img_h:.3f})")
    
    print(f"\nMotorcycles with helmet heads inside:")
    for i, m in enumerate(motorcycles):
        m_bbox = m["bbox"]
        m_conf = m["confidence"]
        heads_inside = 0
        for h in helmet_dets:
            h_bbox = h["bbox"]
            h_cx, h_cy = bbox_center(h_bbox)
            if m_bbox[0] <= h_cx <= m_bbox[2] and m_bbox[1] <= h_cy <= m_bbox[3]:
                heads_inside += 1
        print(f"  Moto {i}: conf={m_conf:.2f} bbox=({m_bbox[0]/img_w:.3f},{m_bbox[1]/img_h:.3f})-({m_bbox[2]/img_w:.3f},{m_bbox[3]/img_h:.3f}) heads_inside={heads_inside}")
    
    print(f"\nPerson-motorcycle overlaps (ratio>=0.20):")
    for i, p in enumerate(persons):
        p_bbox = p["bbox"]
        p_area = (p_bbox[2]-p_bbox[0])*(p_bbox[3]-p_bbox[1])
        p_cx, p_cy = bbox_center(p_bbox)
        for j, m in enumerate(motorcycles):
            m_bbox = m["bbox"]
            ix1 = max(p_bbox[0], m_bbox[0])
            iy1 = max(p_bbox[1], m_bbox[1])
            ix2 = min(p_bbox[2], m_bbox[2])
            iy2 = min(p_bbox[3], m_bbox[3])
            inter = max(0, ix2-ix1)*max(0, iy2-iy1)
            overlap = inter/p_area if p_area > 0 else 0
            if overlap >= 0.10:
                print(f"  Person {i} (conf={p['confidence']:.2f} cx={p_cx/img_w:.3f} cy={p_cy/img_h:.3f}) -> Moto {j}: overlap={overlap:.3f}")
