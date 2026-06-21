"""Check cameras vs demo images coverage."""
import yaml, os, glob

with open('configs/default.yaml') as f:
    cfg = yaml.safe_load(f)

cameras = cfg.get('demo', {}).get('cameras', [])
print('=== CONFIGURED CAMERAS (10) ===')
for c in cameras:
    print(f'  {c["id"]}: {c["name"]}')

# Current demo images
demo_dir = 'frontend/public/demo'
existing = sorted(glob.glob(os.path.join(demo_dir, 'demo_*.jpg')))
print(f'\n=== EXISTING DEMO IMAGES ({len(existing)}) ===')
for f in existing:
    fname = os.path.basename(f)
    # Parse: demo_{violation}_{camera}-01.jpg
    parts = fname.replace('demo_', '').replace('-01.jpg', '').split('_')
    print(f'  {fname}')

# Expected: 1 image per violation type per camera that has zone config
# Zone-configured violations
violation_zone_map = {}
zones = cfg.get('violations', {})
for vtype in ['illegal_parking', 'stop_line_violation', 'wrong_side_driving']:
    vcfg = zones.get(vtype, {})
    for key in ['zone_polygons', 'stop_line_zones', 'lane_polygons']:
        if key in vcfg:
            for z in vcfg[key]:
                cam = z['camera_id']
                violation_zone_map.setdefault(vtype, []).append(cam)

# Model-based violations (no zone needed)
model_violations = ['no_helmet', 'no_seatbelt', 'triple_riding', 'license_plate_mismatch']

print('\n=== ZONE-CONFIGURED VIOLATIONS ===')
for vtype, cams in sorted(violation_zone_map.items()):
    print(f'  {vtype}: cameras {cams}')

print('\n=== MODEL-BASED VIOLATIONS ===')
for vtype in model_violations:
    print(f'  {vtype}: any camera')

# Build expected image list
print('\n=== MISSING IMAGES (should exist for E2E + demo) ===')
all_cam_ids = [c['id'] for c in cameras]
existing_names = set(os.path.basename(f) for f in existing)

# For zone violations: only cameras that have polygon configs
needed = []
for vtype, cams in violation_zone_map.items():
    for cam in cams:
        fname = f'demo_{vtype}_{cam.lower()}-01.jpg'
        if fname not in existing_names:
            needed.append((fname, vtype, cam))

# For model violations: pick cameras that make sense
# We should have at least 2 per model violation type
model_cam_assignments = {
    'no_helmet': ['HEBBAL-01', 'MGROAD-01', 'SILKBOARD-01'],
    'no_seatbelt': ['HEBBAL-01', 'MARATHAHALLI-01', 'WHITEFIELD-01'],
    'triple_riding': ['KRPURAM-01', 'WHITEFIELD-01', 'MARATHAHALLI-01'],
    'license_plate_mismatch': ['MGROAD-01'],  # optional
}
for vtype, cams in model_cam_assignments.items():
    for cam in cams:
        fname = f'demo_{vtype}_{cam.lower()}-01.jpg'
        if fname not in existing_names:
            needed.append((fname, vtype, cam))

if needed:
    for fname, vtype, cam in needed:
        print(f'  MISSING: {fname} (violation={vtype}, camera={cam})')
else:
    print('  None - all expected images exist!')

# Also check: cameras that have NO demo image at all
cameras_with_images = set()
for f in existing:
    fname = os.path.basename(f)
    # Extract camera ID from filename
    for c in cameras:
        cid = c['id'].lower()
        if cid in fname.lower():
            cameras_with_images.add(c['id'])
            break

cameras_without_images = set(all_cam_ids) - cameras_with_images
if cameras_without_images:
    print(f'\n=== CAMERAS WITH NO DEMO IMAGES ===')
    for c in cameras_without_images:
        print(f'  {c}')
