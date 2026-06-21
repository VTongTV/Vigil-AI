import os
import re

with open(r'frontend/src/pages/Upload.tsx', 'r') as f:
    content = f.read()

match = re.search(r'const DEMO_IMAGES:.*?\[(.*?)\];', content, re.DOTALL)
block = match.group(1)

types = re.findall(r'type:\s*"([^"]+)"', block)
camerIds = re.findall(r'cameraId:\s*"([^"]+)"', block)

expected_files = []
for t, c in zip(types, camerIds):
    expected_files.append(f'demo_{t}_{c.lower()}.jpg')

actual_files = set(os.listdir(r'frontend/public/demo'))

missing = set(expected_files) - actual_files
print('Missing preset images:')
for m in sorted(missing):
    print(f' - {m}')
