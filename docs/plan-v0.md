# VigilAI — Master Plan v0 (Initial Draft)

> **Track:** 3 — Automated Photo Identification and Classification for Traffic Violations Using Computer Vision
> **Hackathon:** Flipkart GridLock 2.0, Round 2 (Prototype Phase)
> **Deadline:** June 21, 2026, 11:59 PM IST
> **Team:** Vedant Tong (solo)
> **Hardware:** RTX 3050 Laptop (4GB VRAM), 16GB RAM

---

## 1. Product Vision

**VigilAI** is an AI-powered traffic violation detection system designed for the **Bengaluru Traffic Police (BTP)**. It processes traffic camera images and videos to automatically detect violations, recognize license plates, generate court-admissible evidence, and provide a real-time analytics dashboard for traffic command centers.

**Key Differentiator:** Most Track 3 submissions will be concept notes. We deliver a **working prototype** with a production-grade BTP dashboard — making us the only team that actually built something.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              VigilAI Dashboard (React)                    │
│  Upload │ Live Feed │ Violations │ Evidence │ Analytics  │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API + SSE
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                          │
├──────────────────────────────────────────────────────────┤
│  Preprocessing → Detection → Violation Rules → OCR       │
│       (OpenCV)    (YOLOv8)     (Rule Engine)   (PaddleOCR)│
├──────────────────────────────────────────────────────────┤
│  Evidence Generator → SQLite DB → Analytics Engine       │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Violation Detection Scope

### P0 — Must-Have (Core Demo)

| Violation | Approach | Expected Accuracy |
|-----------|----------|-------------------|
| **Helmet non-compliance** | YOLOv8n (COCO) for vehicle/person + pre-trained helmet model from Roboflow (2-class: helmet/no-helmet) | mAP ~74-83% |
| **Triple riding** | Count persons spatially overlapping with motorcycle bbox (IoU > 0.2 or intersection ratio > 0.3) | ~80-85% |

### P1 — Should-Have (Demo Polish)

| Violation | Approach | Expected Accuracy |
|-----------|----------|-------------------|
| **Illegal parking** | Configurable polygon zones + vehicle dwell time tracking (5s threshold) | ~85-90% |
| **License plate OCR** | Two-stage: YOLOv8n plate detection (Roboflow pre-trained) → PaddleOCR text recognition | ~94-97% char accuracy |

### P2 — Nice-to-Have (UI Only / Mock)

| Violation | Approach | Notes |
|-----------|----------|-------|
| **Red-light violation** | UI placeholder showing "Live Feed" capability | Needs video + signal context, not feasible in 2 days |
| **No seatbelt** | **DROPPED** | Not feasible from overhead traffic camera angles per research |

---

## 4. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Detection** | YOLOv8n (ultralytics) | 195 FPS on RTX 3050, ~0.15GB VRAM FP16, COCO 80-class |
| **Helmet Detection** | Pre-trained YOLOv8n from Roboflow Universe | "Bike Helmet Detection" project (3,735 images, mAP 74.4%) or keremberke/yolov8s-hard-hat-detection from HuggingFace (mAP 83.4%) |
| **Plate Detection** | YOLOv8n from Roboflow (License Plate Recognition, 10,125 images, mAP 97.2%) | Best pre-trained option |
| **OCR** | PaddleOCR (PP-OCRv4 mobile) | Best accuracy on noisy/angled Indian plates, GPU-accelerated, ~1.5GB VRAM full pipeline |
| **Tracking** | ByteTrack (built into ultralytics) | Fast, handles occlusion, persistent track IDs |
| **Preprocessing** | OpenCV (CLAHE, denoise, gamma correction) + albumentations (training aug) | CLAHE alone gives +2-5% mAP |
| **Backend** | FastAPI + uvicorn | Async, auto-docs, lifespan events for model loading |
| **Database** | SQLite + SQLAlchemy (sync) | Simple, file-based, no external deps |
| **Frontend** | React 19 + Vite + TailwindCSS + shadcn/ui | Fast build, production look |
| **Charts** | Recharts | React-native, declarative, good for dashboards |
| **Map** | react-leaflet (OpenStreetMap) | Free, no API key needed |
| **State Management** | Zustand | Lightweight, no boilerplate |
| **Video Processing** | OpenCV VideoCapture + frame sampling (every 3rd frame) + SSE for progress | Memory-efficient streaming |

---

## 5. VRAM Budget (4GB RTX 3050)

| Component | VRAM (FP16) | Notes |
|-----------|------------|-------|
| YOLOv8n COCO model | ~0.15 GB | Vehicle + person detection |
| YOLOv8n helmet model | ~0.15 GB | Helmet/no-helmet classification |
| YOLOv8n plate model | ~0.15 GB | License plate detection |
| PaddleOCR (PP-OCRv4 mobile) | ~1.5 GB | Full pipeline (det+rec) |
| CUDA context + buffers | ~0.5 GB | Overhead |
| **TOTAL** | **~2.45 GB** | **1.55 GB headroom** |

Strategy: Load all models at FastAPI startup via lifespan. Never load/unload per request. Run YOLOv8 models sequentially (not parallel) to minimize peak VRAM.

---

## 6. Project Structure

```
Round 2/
├── AGENTS.md
├── plan.md
├── requirements.txt
├── .gitignore
├── configs/
│   └── default.yaml           # Model paths, thresholds, API settings, zone polygons
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app + lifespan
│   │   ├── config.py           # Pydantic Settings
│   │   ├── schemas.py          # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── detect.py       # POST /api/v1/detect (image upload)
│   │   │   ├── video.py        # POST /api/v1/video (video upload + SSE progress)
│   │   │   ├── violations.py   # GET /api/v1/violations (CRUD + filtering)
│   │   │   ├── evidence.py     # GET /api/v1/evidence/{id} (annotated image)
│   │   │   └── analytics.py    # GET /api/v1/analytics (stats + trends)
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── preprocessing.py   # Image enhancement (CLAHE, denoise, gamma)
│   │   │   ├── detector.py        # YOLOv8 wrapper (COCO + helmet + plate)
│   │   │   ├── violations.py      # Rule-based violation detection engine
│   │   │   ├── ocr.py             # PaddleOCR wrapper + Indian plate validation
│   │   │   └── evidence.py        # Annotated image generation (OpenCV drawing)
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── database.py        # SQLite engine + session
│   │       └── models.py         # SQLAlchemy ORM models
│   └── weights/                  # Pre-trained model weights (.pt files)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── Layout.tsx       # BTP-branded sidebar + header
│   │   │   ├── ViolationCard.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── AnnotatedViewer.tsx  # Canvas-based bbox overlay
│   │   │   └── MapView.tsx      # Leaflet violation heatmap
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Overview stats + charts
│   │   │   ├── Upload.tsx       # Image upload + detection results
│   │   │   ├── Evidence.tsx     # Annotated image viewer + metadata
│   │   │   ├── Analytics.tsx    # Charts + trends + map
│   │   │   ├── Violations.tsx   # Searchable/filterable table
│   │   │   └── LiveFeed.tsx     # Video upload + processing + results
│   │   ├── lib/
│   │   │   └── api.ts           # Axios API client
│   │   └── types/
│   │       └── index.ts         # TypeScript types
│   └── public/
├── data/
│   ├── sample_images/           # Test traffic images for demo
│   └── sample_videos/           # Test video clips for demo
├── outputs/
│   ├── evidence/                # Generated annotated evidence images
│   └── reports/                 # Exported reports
└── scripts/
    ├── setup_weights.py         # Download YOLOv8 + helmet + plate weights
    └── seed_db.py               # Seed sample violation data for demo
```

---

## 7. Phase-Wise Build Plan

### Phase 1: Foundation (Day 1 Morning, ~4 hours)
- Create venv, install all dependencies
- Project structure scaffolding
- Download pre-trained model weights (YOLOv8n COCO, helmet, plate)
- Implement `configs/default.yaml` + `backend/app/config.py`
- Verify: models load, basic inference works

### Phase 2: CV Pipeline (Day 1 Afternoon, ~6 hours)
- Implement `preprocessing.py` (CLAHE, denoise, gamma)
- Implement `detector.py` (YOLOv8 wrapper, multi-model)
- Implement `violations.py` (helmet + triple riding rules)
- Implement `ocr.py` (PaddleOCR + Indian plate validation)
- Implement `evidence.py` (annotated image generation)
- Verify: end-to-end image → violation + evidence pipeline works

### Phase 3: Backend API (Day 1 Night, ~4 hours)
- Implement FastAPI app with lifespan (model loading)
- Implement all routes (detect, video, violations, evidence, analytics)
- Implement SQLite schema + CRUD
- Wire CV pipeline to API endpoints
- Verify: `curl` / Swagger tests pass

### Phase 4: Frontend Core (Day 2 Morning, ~6 hours)
- Scaffold React + Vite + Tailwind + shadcn/ui
- BTP-branded Layout (sidebar, header, dark theme)
- Dashboard page (stats cards, recent violations)
- Upload page (image upload → detection results)
- Evidence viewer (canvas bbox overlay)
- Verify: upload image → see violations in dashboard

### Phase 5: Frontend Polish + Integration (Day 2 Afternoon, ~6 hours)
- Analytics page (Recharts: violations by type, time, location)
- Map page (Leaflet heatmap)
- Live Feed page (video upload + SSE progress)
- Violations table (filter, search, sort)
- Seed demo data for impressive screenshots
- End-to-end testing
- Verify: full system demo works smoothly

---

## 8. Evidence Compliance (Rule 167A, MV Act)

Every generated violation record will include:
- **Annotated image** with bounding boxes + violation labels
- **Timestamp** (ISO 8601, device-certified)
- **GPS coordinates** (configurable per camera in default.yaml)
- **Camera/Device ID** (e.g., CAM-BLR-042)
- **License plate text** (if detected, validated against Indian format)
- **Confidence score** (model certainty)
- **Violated section** of MV Act (e.g., Section 129 for no helmet)
- **Image hash** (SHA-256 for integrity verification)
- **Unique violation ID** (UUID)

---

## 9. Demo Strategy

1. **Opening**: "87% of BTP violations are now contactless, but only 75 junctions have AI cameras. VigilAI scales this to ANY CCTV camera."
2. **Demo Flow**: Upload traffic image → 2-second processing → violation detected + license plate read → evidence generated → dashboard updates
3. **Video Demo**: Upload 30-second clip → real-time processing with SSE progress → multiple violations caught
4. **Dashboard Walkthrough**: Analytics charts, violation heatmap, searchable records
5. **Close**: "Runs on a ₹25K GPU. Each junction costs <₹50K to retrofit. Fully Rule 167A compliant evidence output."

---

## 10. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| PaddleOCR install fails on Windows | Medium | High | Fallback: EasyOCR (simpler pip install, PyTorch-based) |
| Helmet model accuracy too low | Medium | Medium | Use keremberke/yolov8s model from HuggingFace (83.4% mAP) as backup |
| VRAM OOM with 3 YOLO models + OCR | Low | High | Load models on-demand, release after inference; or use CPU for OCR |
| Frontend takes too long | Medium | High | Use shadcn/ui components, skip animations, focus on data display |
| Video processing too slow for demo | Medium | Medium | Pre-process demo video, show cached results with SSE simulation |
| Demo fails live | Medium | Critical | Have pre-recorded demo + screenshots as backup |

---

## 11. Key Metrics to Report

| Metric | Target | How to Measure |
|--------|--------|---------------|
| mAP@50 (helmet) | >0.74 | Roboflow validation set |
| mAP@50 (triple riding) | >0.70 | Manual evaluation on test images |
| OCR character accuracy | >90% | Comparison on Indian plate test set |
| Inference FPS (single image) | >25 FPS | RTX 3050 benchmark |
| End-to-end latency (upload → result) | <5s | API response time |
| Dashboard load time | <2s | Lighthouse score |
