"""Diagnostic: print COCO/helmet details for failing demo images."""

import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

import numpy as np
from PIL import Image

from backend.app.core.detector import ModelManager
from backend.app.core.preprocessing import preprocess_image

FAILED = [
    "demo_illegal_parking_kormangala-01.jpg",
    "demo_illegal_parking_mgroad-01.jpg",
    "demo_no_helmet_silkboard-01.jpg",
    "demo_stop_line_violation_electronic-01.jpg",
    "demo_triple_riding_krpuram-01.jpg",
]

COCO_NAMES = {
    0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 5: "bus",
    7: "truck", 9: "traffic_light", 11: "stop_sign",
}

mm = ModelManager()
mm.load_resident_models()

demo_dir = os.path.join(PROJECT_ROOT, "frontend", "public", "demo")

for fname in FAILED:
    path = os.path.join(demo_dir, fname)
    img = Image.open(path).convert("RGB")
    img_np = np.array(img)
    h, w = img_np.shape[:2]
    processed = preprocess_image(img_np)

    coco = mm.detect_coco(processed)
    helmet = mm.detect_helmet(processed)

    print(f"\n{'='*70}")
    print(f"  {fname}  ({w}x{h})")
    print(f"{'='*70}")

    # Group COCO by class
    by_class: dict[int, list] = {}
    for d in coco:
        cid = d["class_id"]
        by_class.setdefault(cid, []).append(d)

    print(f"\n  COCO detections by class:")
    for cid in sorted(by_class.keys()):
        name = COCO_NAMES.get(cid, f"class_{cid}")
        dets = by_class[cid]
        confs = [f"{d['confidence']:.2f}" for d in dets]
        # Show normalized centers
        centers = []
        for d in dets:
            x1, y1, x2, y2 = d["bbox"]
            cx = ((x1 + x2) / 2) / w
            cy = ((y1 + y2) / 2) / h
            centers.append(f"({cx:.2f},{cy:.2f})")
        print(f"    {name} ({cid}): {len(dets)} — conf: {confs[:10]}{'...' if len(confs) > 10 else ''}")
        if len(dets) <= 15:
            print(f"      centers: {centers}")

    print(f"\n  Helmet detections: {len(helmet)}")
    for d in helmet:
        x1, y1, x2, y2 = d["bbox"]
        cx = ((x1 + x2) / 2) / w
        cy = ((y1 + y2) / 2) / h
        print(f"    {d['class_name']}: conf={d['confidence']:.2f}, center=({cx:.2f},{cy:.2f})")

    # For parking images: show which car centers are in/near the parking zone
    if "illegal_parking" in fname:
        cam_id = fname.split("_")[-1].replace("-01.jpg", "").upper() + "-01"
        print(f"\n  Camera: {cam_id}")
        car_dets = by_class.get(2, [])
        print(f"  Car centers (normalized):")
        for i, d in enumerate(car_dets):
            x1, y1, x2, y2 = d["bbox"]
            cx = ((x1 + x2) / 2) / w
            cy = ((y1 + y2) / 2) / h
            print(f"    car[{i}]: center=({cx:.2f},{cy:.2f}), conf={d['confidence']:.2f}")

    # For stop-line images: show vehicle front points
    if "stop_line" in fname:
        print(f"\n  Vehicle front points (normalized bottom-center):")
        for cid in [2, 3, 5, 7]:  # car, motorcycle, bus, truck
            for d in by_class.get(cid, []):
                x1, y1, x2, y2 = d["bbox"]
                fcx = ((x1 + x2) / 2) / w
                fcy = y2 / h
                name = COCO_NAMES.get(cid, f"class_{cid}")
                print(f"    {name}: front=({fcx:.2f},{fcy:.2f}), conf={d['confidence']:.2f}")

    # For triple riding: show motorcycle-person associations
    if "triple_riding" in fname:
        motorcycles = by_class.get(3, [])
        persons = by_class.get(0, [])
        print(f"\n  Motorcycles: {len(motorcycles)}, Persons: {len(persons)}")
        for i, m in enumerate(motorcycles):
            x1, y1, x2, y2 = m["bbox"]
            mcx = ((x1 + x2) / 2) / w
            mcy = ((y1 + y2) / 2) / h
            mw = (x2 - x1) / w
            print(f"    moto[{i}]: center=({mcx:.2f},{mcy:.2f}), w={mw:.2f}, conf={m['confidence']:.2f}")
        # Check persons near each motorcycle
        for i, m in enumerate(motorcycles):
            mx1, my1, mx2, my2 = m["bbox"]
            mcx = (mx1 + mx2) / 2
            mcy = (my1 + my2) / 2
            mw = mx2 - mx1
            riders = []
            for p in persons:
                px1, py1, px2, py2 = p["bbox"]
                pcx = (px1 + px2) / 2
                pcy = (py1 + py2) / 2
                h_dist = abs(pcx - mcx) / (mw + 1e-6)
                if h_dist < 0.65:
                    riders.append((pcx / w, pcy / h, p["confidence"]))
            print(f"    moto[{i}] riders nearby: {len(riders)} — {[(f'({r[0]:.2f},{r[1]:.2f}', f'{r[2]:.2f}') for r in riders]}")

    # For helmet: show person-motorcycle associations
    if "no_helmet" in fname:
        motorcycles = by_class.get(3, [])
        persons = by_class.get(0, [])
        print(f"\n  Motorcycles: {len(motorcycles)}, Persons: {len(persons)}")
        for i, m in enumerate(motorcycles):
            mx1, my1, mx2, my2 = m["bbox"]
            mcx = (mx1 + mx2) / 2
            mcy = (my1 + my2) / 2
            mw = mx2 - mx1
            # Find persons near this motorcycle
            nearby = []
            for p in persons:
                px1, py1, px2, py2 = p["bbox"]
                pcx = (px1 + px2) / 2
                pcy = (py1 + py2) / 2
                # Center-in-bbox or near
                if mx1 - mw * 0.05 <= pcx <= mx2 + mw * 0.05 and my1 <= pcy <= my2:
                    nearby.append(p)
            print(f"    moto[{i}]: {len(nearby)} persons on bike, conf={m['confidence']:.2f}")
