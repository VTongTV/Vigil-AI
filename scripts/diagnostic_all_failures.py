"""Comprehensive diagnostic for all 10 failing E2E images.

For each failing image, shows:
- All COCO detections (class, center coords, confidence)
- Relevant zone polygons from config
- Whether any detection center falls inside the zone
- Helmet/triple-riding specific details
"""
import os, sys, yaml, numpy as np
from PIL import Image
from shapely.geometry import Point, Polygon

sys.path.insert(0, '.')
os.chdir('.')

from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image

# Load config
with open('configs/default.yaml') as f:
    cfg = yaml.safe_load(f)

mm = ModelManager()
mm.load_resident_models()

COCO_NAMES = {0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}

def point_in_poly(nx, ny, poly_points):
    """Check if normalized (x,y) is inside polygon of normalized points."""
    poly = Polygon([(p[0], p[1]) for p in poly_points])
    return poly.contains(Point(nx, ny))

def get_zone(camera_id, zone_type):
    """Get zone polygon for camera + type."""
    zones = cfg.get('zones', {}).get(zone_type, [])
    for z in zones:
        if z.get('camera_id') == camera_id:
            return z.get('polygon', [])
    return []

# ─── FAILING IMAGES ───
failures = [
    ('demo_illegal_parking_kormangala-01.jpg', 'illegal_parking', 'KORMANGALA-01'),
    ('demo_illegal_parking_silkboard-01.jpg', 'illegal_parking', 'SILKBOARD-01'),
    ('demo_no_helmet_silkboard-01.jpg', 'no_helmet', 'SILKBOARD-01'),
    ('demo_no_seatbelt_whitefield-01.jpg', 'no_seatbelt', 'WHITEFIELD-01'),
    ('demo_stop_line_violation_krpuram-01.jpg', 'stop_line_violation', 'KRPURAM-01'),
    ('demo_triple_riding_krpuram-01.jpg', 'triple_riding', 'KRPURAM-01'),
    ('demo_triple_riding_marathahalli-01.jpg', 'triple_riding', 'MARATHAHALLI-01'),
    ('demo_wrong_side_driving_bannerghatta-01.jpg', 'wrong_side_driving', 'BANNERGHATTA-01'),
    ('demo_wrong_side_driving_electronic-01.jpg', 'wrong_side_driving', 'ELECTRONIC-01'),
    ('demo_wrong_side_driving_yelahanka-01.jpg', 'wrong_side_driving', 'YELAHANKA-01'),
]

for fname, expected_vtype, cam_id in failures:
    print(f'\n{"="*80}')
    print(f'IMAGE: {fname}')
    print(f'EXPECTED: {expected_vtype}  |  CAMERA: {cam_id}')
    print(f'{"="*80}')

    img_path = f'frontend/public/demo/{fname}'
    if not os.path.exists(img_path):
        print(f'  *** FILE NOT FOUND ***')
        continue

    img = Image.open(img_path).convert('RGB')
    img_np = np.array(img)
    h, w = img_np.shape[:2]
    processed = preprocess_image(img_np)

    # COCO detections
    coco = mm.detect_coco(processed)
    print(f'\n  COCO detections ({len(coco)}):')
    for d in coco:
        x1, y1, x2, y2 = d["bbox"]
        cx, cy = ((x1+x2)/2)/w, ((y1+y2)/2)/h
        bw, bh = (x2-x1)/w, (y2-y1)/h
        print(f'    {d["class_name"]:12s} conf={d["confidence"]:.2f}  center=({cx:.3f},{cy:.3f})  size=({bw:.3f}x{bh:.3f})')

    # Helmet detections (if relevant)
    if expected_vtype in ('no_helmet', 'triple_riding'):
        helmet = mm.detect_helmet(processed)
        print(f'\n  Helmet detections ({len(helmet)}):')
        for d in helmet:
            x1, y1, x2, y2 = d["bbox"]
            cx, cy = ((x1+x2)/2)/w, ((y1+y2)/2)/h
            print(f'    {d["class_name"]:16s} conf={d["confidence"]:.3f}  center=({cx:.3f},{cy:.3f})')

    # Zone-specific diagnostics
    if expected_vtype == 'illegal_parking':
        poly = get_zone(cam_id, 'illegal_parking')
        print(f'\n  Parking zone polygon: {poly}')
        cars = [d for d in coco if d["class_id"] == 2]
        inside = 0
        for d in cars:
            x1, y1, x2, y2 = d["bbox"]
            cx, cy = ((x1+x2)/2)/w, ((y1+y2)/2)/h
            in_zone = point_in_poly(cx, cy, poly) if poly else False
            if in_zone: inside += 1
            print(f'    car center=({cx:.3f},{cy:.3f}) inside={in_zone}')
        print(f'  Cars inside parking zone: {inside}/{len(cars)}')

    elif expected_vtype == 'stop_line_violation':
        poly = get_zone(cam_id, 'stop_line')
        print(f'\n  Stop-line zone polygon: {poly}')
        vehicles = [d for d in coco if d["class_id"] in (2, 3, 5, 7)]
        inside = 0
        for d in vehicles:
            x1, y1, x2, y2 = d["bbox"]
            front_y = y1 / h  # front = top of bbox
            cx = ((x1+x2)/2)/w
            in_zone = point_in_poly(cx, front_y, poly) if poly else False
            if in_zone: inside += 1
            print(f'    {d["class_name"]} center=({cx:.3f},{front_y:.3f}) [front_y] inside={in_zone}')
        print(f'  Vehicles with front in stop-line zone: {inside}/{len(vehicles)}')

    elif expected_vtype == 'wrong_side_driving':
        poly = get_zone(cam_id, 'wrong_side')
        print(f'\n  Wrong-side lane polygon: {poly}')
        vehicles = [d for d in coco if d["class_id"] in (2, 3, 5, 7)]
        inside = 0
        for d in vehicles:
            x1, y1, x2, y2 = d["bbox"]
            cx, cy = ((x1+x2)/2)/w, ((y1+y2)/2)/h
            in_zone = point_in_poly(cx, cy, poly) if poly else False
            if in_zone: inside += 1
            print(f'    {d["class_name"]} center=({cx:.3f},{cy:.3f}) inside={in_zone}')
        print(f'  Vehicles inside wrong-side lane: {inside}/{len(vehicles)}')

    elif expected_vtype == 'no_helmet':
        persons = [d for d in coco if d["class_id"] == 0]
        motorcycles = [d for d in coco if d["class_id"] == 3]
        helmet = mm.detect_helmet(processed)
        without_helmet = [d for d in helmet if d["class_name"] == 'Without Helmet']
        print(f'\n  Persons: {len(persons)}, Motorcycles: {len(motorcycles)}, Without Helmet dets: {len(without_helmet)}')
        # Show person-helmet association at low threshold
        results_low = mm.helmet_model.model.predict(processed, conf=0.01, verbose=False)
        print(f'  Helmet model raw (conf=0.01):')
        for r in results_low:
            for box in r.boxes:
                cls_name = r.names[int(box.cls[0])]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                cx, cy = ((x1+x2)/2)/w, ((y1+y2)/2)/h
                print(f'    {cls_name:16s} conf={conf:.3f} center=({cx:.3f},{cy:.3f})')

    elif expected_vtype == 'triple_riding':
        persons = [d for d in coco if d["class_id"] == 0]
        motorcycles = [d for d in coco if d["class_id"] == 3]
        print(f'\n  Persons: {len(persons)}, Motorcycles: {len(motorcycles)}')
        # Show person-motorcycle proximity
        for mi, m in enumerate(motorcycles):
            mx1, my1, mx2, my2 = m["bbox"]
            mcx, mcy = ((mx1+mx2)/2)/w, ((my1+my2)/2)/h
            mw = (mx2-mx1)/w
            mh = (my2-my1)/h
            print(f'    motorcycle[{mi}] center=({mcx:.3f},{mcy:.3f}) size=({mw:.3f}x{mh:.3f})')
            for pi, p in enumerate(persons):
                px1, py1, px2, py2 = p["bbox"]
                pcx, pcy = ((px1+px2)/2)/w, ((py1+py2)/2)/h
                # Check horizontal overlap
                h_overlap = abs(pcx - mcx) < mw * 0.75
                v_overlap = abs(pcy - mcy) < mh * 0.5
                if h_overlap:
                    print(f'      person[{pi}] center=({pcx:.3f},{pcy:.3f}) h_overlap={h_overlap} v_overlap={v_overlap}')

    elif expected_vtype == 'no_seatbelt':
        cars = [d for d in coco if d["class_id"] == 2]
        print(f'\n  Cars: {len(cars)}')
        # Run seatbelt classification manually
        try:
            from backend.app.core.violations import extract_windshield_crops
            crops = extract_windshield_crops(cars, processed, w, h)
            print(f'  Windshield crops: {len(crops)}')
            if crops and mm.seatbelt_model is None:
                mm.load_seatbelt_on_demand()
            for ci, crop_info in enumerate(crops):
                result = mm.classify_seatbelt(crop_info["crop"])
                print(f'    car[{ci}] crop_shape={crop_info["crop"].shape} result={result}')
        except Exception as e:
            print(f'  Seatbelt error: {e}')

print(f'\n{"="*80}')
print('DIAGNOSTIC COMPLETE')
