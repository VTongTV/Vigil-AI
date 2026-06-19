# VigilAI — Complete Tech Stack Reference

> Every library, version, purpose, and justification
> Hardware: RTX 3050 4GB VRAM, Windows 11, 16GB RAM

---

## 1. VRAM Budget

| Component | VRAM Allocation | State | When |
|-----------|----------------|-------|------|
| YOLOv8n COCO weights | ~6.5 MB | Resident | Always loaded after startup |
| YOLOv8n Helmet weights | ~6.5 MB | Resident | Always loaded after startup |
| PyTorch CUDA context | ~500 MB | Resident | Always after first CUDA call |
| Inference buffers + activations | ~500 MB | Transient | During inference |
| **Total resident** | **~1.5 GB** | **Always loaded** | |
| YOLOv8n Plate weights | ~6.5 MB | On-demand | Load → infer → unload |
| Plate inference buffers | ~300 MB | Transient | During plate inference |
| **Total peak** | **~1.8 GB** | **During plate inference** | |
| **Remaining headroom** | **~2.2 GB** | **Available** | |

### Memory Map

```
4 GB VRAM
┌──────────────────────────────────┐
│ ██████████████████░░░░░░░░░░░░░░ │ 1.5 GB resident
│ ████████████████████████░░░░░░░░ │ 1.8 GB peak
│                                  │ 2.2 GB headroom
└──────────────────────────────────┘
```

---

## 2. Python Dependencies (requirements.txt)

```
# Computer Vision
ultralytics>=8.3.0
opencv-python-headless>=4.10.0
rapidocr-onnxruntime==1.4.4
onnxruntime>=1.18.0

# Backend
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
sqlalchemy>=2.0.0
pydantic>=2.0.0
python-multipart>=0.0.9

# Utilities
numpy>=1.26.0
pillow>=10.0.0
python-dotenv>=1.0.0
```

### Detailed Justification

| Package | Version | Purpose | Why This Over Alternatives |
|---------|---------|---------|---------------------------|
| `ultralytics` | ≥8.3.0 | YOLOv8n model loading + inference | Official YOLOv8 implementation; smallest nano model fits VRAM; PyTorch-based for GPU inference |
| `opencv-python-headless` | ≥4.10.0 | Image preprocessing, evidence annotation, CLAHE | Headless version avoids GUI dependencies on server; industry standard for CV; bilateral filter, CLAHE, drawing primitives |
| `rapidocr-onnxruntime` | 1.4.4 | License plate OCR (CPU) | ONNX-based (no PaddlePaddle dependency); 3-5× faster than PaddleOCR on CPU; smaller install; proven on Indian plates |
| `onnxruntime` | ≥1.18.0 | ONNX inference backend for RapidOCR | Required by rapidocr-onnxruntime; CPU-only execution (no GPU competition with YOLOv8) |
| `fastapi` | ≥0.115.0 | REST API framework | Auto-generated OpenAPI docs; async-ready; native Python type hints; middleware support |
| `uvicorn[standard]` | ≥0.30.0 | ASGI server | Standard for FastAPI; [standard] extras include uvloop and httptools for performance |
| `sqlalchemy` | ≥2.0.0 | ORM for SQLite | Mature, well-documented; sync mode simpler for hackathon; migration-free with SQLite |
| `pydantic` | ≥2.0.0 | Request/response validation | Built into FastAPI; v2 is 5-50× faster than v1; automatic JSON schema generation |
| `python-multipart` | ≥0.0.9 | File upload handling | Required by FastAPI for multipart/form-data (image upload) |
| `numpy` | ≥1.26.0 | Array operations | Required by OpenCV, ultralytics, and image manipulation |
| `pillow` | ≥10.0.0 | Image format support | Used for image validation and conversion; lightweight |
| `python-dotenv` | ≥1.0.0 | Environment variable loading | Load .env file for API keys, config |

### Why NOT PaddleOCR

| Factor | RapidOCR | PaddleOCR |
|--------|----------|-----------|
| Install size | ~50 MB | ~500 MB |
| Dependencies | ONNX Runtime only | PaddlePaddle framework |
| GPU requirement | CPU only | GPU recommended |
| Windows support | Native | Requires PaddlePaddle Windows build |
| Speed (CPU) | 30-50ms per plate | 100-200ms per plate |
| Indian plate accuracy | Good (tested) | Good |

### Why NOT EasyOCR

| Factor | RapidOCR | EasyOCR |
|--------|----------|---------|
| Backend | ONNX Runtime | PyTorch |
| GPU competition | None (CPU) | Competes with YOLOv8 for VRAM |
| Install size | ~50 MB | ~200 MB |
| Speed | 30-50ms | 50-100ms |

---

## 3. Node.js Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "recharts": "^2.12.0",
    "react-leaflet": "^4.2.0",
    "leaflet": "^1.9.0",
    "lucide-react": "^0.400.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/leaflet": "^1.9.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0"
  }
}
```

### Detailed Justification

| Package | Version | Purpose | Why This Over Alternatives |
|---------|---------|---------|---------------------------|
| `react` | 19.x | UI framework | Latest stable with concurrent features; server components (not used here but forward-compatible) |
| `react-dom` | 19.x | React DOM renderer | Required pair for React 19 |
| `react-router-dom` | 7.x | Client-side routing | Standard React router; v7 supports loaders and data APIs |
| `zustand` | 5.x | State management | 1KB gzipped; no boilerplate; perfect for demo mode flag + recent detections; no context providers needed |
| `recharts` | 2.x | Charts (waterfall, analytics) | React-native; declarative; supports bar charts for waterfall; lightweight vs D3 |
| `react-leaflet` | 4.x | Map component | React wrapper for Leaflet; supports custom tile layers (MapmyIndia) |
| `leaflet` | 1.9.x | Map engine | Required peer dependency for react-leaflet; mature, extensible |
| `lucide-react` | 0.400.x | Icons | Consistent icon set; tree-shakeable; used by shadcn/ui |
| `tailwindcss` | 4.x | Utility-first CSS | Rapid prototyping; dark theme native; v4 has CSS-based config |
| `class-variance-authority` | 0.7.x | Component variants | Used by shadcn/ui for variant management |
| `clsx` | 2.x | Conditional classnames | Lightweight classname builder; used by shadcn/ui |
| `tailwind-merge` | 2.x | Merge Tailwind classes | Used by shadcn/ui to resolve class conflicts |

### Why NOT These Alternatives

| Rejected | In Favor Of | Reason |
|----------|-------------|--------|
| Redux | Zustand | Redux requires actions, reducers, selectors, store config. Zustand: 1 hook, done. |
| MUI | shadcn/ui | MUI is a runtime dependency (~300KB). shadcn is copy-paste (0KB runtime). |
| D3.js | Recharts | D3 is imperative and complex. Recharts is declarative React. |
| mapbox-gl | react-leaflet | Mapbox requires API key + token management. Leaflet + MapmyIndia is free. |
| Next.js | Vite + React | No SSR needed; Vite is faster for SPA development. |
| Axios | Native fetch | Fetch is built-in; no extra dependency needed for simple REST calls. |

---

## 4. Install Commands

### Python (Backend)

```bash
# Create virtual environment (if not exists)
python -m venv "D:\Web Project\Flipkart\venv"

# Activate
& "D:\Web Project\Flipkart\venv\Scripts\Activate.ps1"

# Install dependencies
pip install ultralytics>=8.3.0 opencv-python-headless>=4.10.0 rapidocr-onnxruntime==1.4.4 onnxruntime>=1.18.0 fastapi>=0.115.0 "uvicorn[standard]>=0.30.0" sqlalchemy>=2.0.0 pydantic>=2.0.0 python-multipart>=0.0.9 numpy>=1.26.0 pillow>=10.0.0 python-dotenv>=1.0.0

# Or from requirements.txt
pip install -r requirements.txt
```

### Node.js (Frontend)

```bash
cd "D:\Web Project\Flipkart\Round 2\frontend"

# Initialize (if not exists)
npm create vite@latest . -- --template react-ts

# Install core
npm install react@19 react-dom@19 react-router-dom@7 zustand@5 recharts@2 react-leaflet@4 leaflet@1.9 lucide-react@0.400 tailwindcss@4 @tailwindcss/vite@4 class-variance-authority@0.7 clsx@2 tailwind-merge@2

# Install dev
npm install -D @types/react@19 @types/react-dom@19 @types/leaflet@1.9 @vitejs/plugin-react@4 typescript@5 vite@6

# Initialize shadcn/ui
npx shadcn@latest init

# Add components
npx shadcn@latest add button card badge dialog table tabs separator scroll-area select input label dropdown-menu tooltip
```

---

## 5. Environment Variables

### Backend (.env)

```env
OMP_NUM_THREADS=4
ONNX_NUM_THREADS=4
CUDA_VISIBLE_DEVICES=0
VIGILAI_HOST=0.0.0.0
VIGILAI_PORT=8000
VIGILAI_DB_PATH=outputs/vigilai.db
VIGILAI_EVIDENCE_DIR=outputs/evidence
VIGILAI_WEIGHTS_DIR=weights
VIGILAI_DEMO_MODE=false
```

### Frontend (.env)

```env
VITE_API_BASE=http://localhost:8000/api/v1
VITE_MAPMYINDIA_API_KEY=your_mapmyindia_key_here
```

---

## 6. Model Files

| Model | Source | Format | Size | Path |
|-------|--------|--------|------|------|
| YOLOv8n COCO | Ultralytics auto-download | `.pt` | 6.5 MB | `weights/yolov8n.pt` |
| Helmet Model | Roboflow/HuggingFace | `.pt` or `.onnx` | ~6 MB | `weights/helmet.pt` |
| Plate Model | Roboflow | `.pt` or `.onnx` | ~6 MB | `weights/plate.pt` |

### Download Commands

```bash
# YOLOv8n (auto-downloads on first use)
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Helmet + Plate models (from Roboflow)
# URLs TBD after model selection — add to scripts/download_weights.sh
```

---

## 7. System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| Python | 3.11 | 3.12 |
| Node.js | 20 LTS | 22 LTS |
| CUDA | 11.8 | 12.x |
| VRAM | 4 GB | 6 GB |
| RAM | 8 GB | 16 GB |
| Disk | 2 GB | 5 GB |
| OS | Windows 10 | Windows 11 |

---

## 8. Port Allocations

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite dev) | 5173 | http://localhost:5173 |
| Backend (FastAPI) | 8000 | http://localhost:8000 |
| API Docs (Swagger) | 8000 | http://localhost:8000/docs |
| Health Check | 8000 | http://localhost:8000/health |
