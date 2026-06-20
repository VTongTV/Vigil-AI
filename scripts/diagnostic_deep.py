"""Deep diagnostic for 2 remaining failures."""
import os, sys, numpy as np
from PIL import Image

sys.path.insert(0, '.')
os.chdir('.')

from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image

mm = ModelManager()
mm.load_resident_models()

# --- SILKBOARD no_helmet: check raw helmet model output at very low conf ---
img = Image.open('frontend/public/demo/demo_no_helmet_silkboard-01.jpg').convert('RGB')
img_np = np.array(img)
h, w = img_np.shape[:2]
processed = preprocess_image(img_np)

results_low = mm.helmet_model.model.predict(processed, conf=0.01, verbose=False)
print('=== SILKBOARD helmet model raw results (conf=0.01) ===')
for r in results_low:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        cls_name = r.names[cls_id]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = ((x1+x2)/2)/w
        cy = ((y1+y2)/2)/h
        print(f'  {cls_name}: conf={conf:.3f}, center=({cx:.2f},{cy:.2f})')
if not results_low or not results_low[0].boxes:
    print('  NO detections even at conf=0.01!')

print()

# --- KRPURAM triple_riding: check COCO persons at lower conf ---
img2 = Image.open('frontend/public/demo/demo_triple_riding_krpuram-01.jpg').convert('RGB')
img_np2 = np.array(img2)
h2, w2 = img_np2.shape[:2]
processed2 = preprocess_image(img_np2)

results2 = mm.coco_model.model.predict(processed2, conf=0.15, verbose=False)
print('=== KRPURAM COCO detections at conf=0.15 ===')
motos = []
persons = []
for r in results2:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        cx = ((x1+x2)/2)/w2
        cy = ((y1+y2)/2)/h2
        cls_name = r.names[cls_id]
        if cls_id == 0:
            persons.append({'cx': cx, 'cy': cy, 'conf': conf, 'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})
        if cls_id == 3:
            motos.append({'cx': cx, 'cy': cy, 'conf': conf, 'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})

print(f'  Motorcycles: {len(motos)}')
for i, m in enumerate(motos):
    print(f'    moto[{i}]: center=({m["cx"]:.2f},{m["cy"]:.2f}), conf={m["conf"]:.2f}')
print(f'  Persons: {len(persons)}')
for i, p in enumerate(persons):
    print(f'    person[{i}]: center=({p["cx"]:.2f},{p["cy"]:.2f}), conf={p["conf"]:.2f}')

# Check triple-riding association
print()
print('  Triple-riding check (vertical_overlap_threshold=0.20):')
for i, m in enumerate(motos):
    mw = m['x2'] - m['x1']
    riders = []
    for p in persons:
        # Horizontal: |p_cx - m_cx| <= m_w * 0.65
        h_dist = abs(p['cx'] - m['cx'])
        if h_dist > 0.65:
            continue
        # Vertical overlap: overlap_h / person_h >= 0.20
        overlap_top = max(p['y1'], m['y1'])
        overlap_bot = min(p['y2'], m['y2'])
        overlap_h = max(0, overlap_bot - overlap_top)
        person_h = p['y2'] - p['y1']
        if person_h > 0 and overlap_h / person_h >= 0.20:
            riders.append(p)
        else:
            print(f'    person at ({p["cx"]:.2f},{p["cy"]:.2f}) rejected: h_dist={h_dist:.2f}, v_overlap={overlap_h/person_h if person_h > 0 else 0:.2f}')
    print(f'    moto[{i}] ({m["cx"]:.2f},{m["cy"]:.2f}): {len(riders)} riders')
    for r in riders:
        print(f'      rider: ({r["cx"]:.2f},{r["cy"]:.2f}), conf={r["conf"]:.2f}')
