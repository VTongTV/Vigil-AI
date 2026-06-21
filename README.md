<div align="center">

<img src="docs/assets/logo.svg" alt="VigilAI Logo" width="120" height="120" />

<br/>

<img src="https://img.shields.io/badge/VigilAI-AI--Powered%20Traffic%20Violation%20Detection-6366f1?style=for-the-badge&labelColor=0f172a&color=6366f1" alt="VigilAI" />

<br/>

<img src="https://img.shields.io/badge/Flipkart-GridLock%202.0-28a745?style=flat-square&labelColor=1a1a2e" alt="Flipkart GridLock 2.0" />
<img src="https://img.shields.io/badge/Round-2-6366f1?style=flat-square&labelColor=1a1a2e" alt="Round 2" />
<img src="https://img.shields.io/badge/Track-3-f59e0b?style=flat-square&labelColor=1a1a2e" alt="Track 3" />
<img src="https://img.shields.io/badge/Violations-7%2F7-ef4444?style=flat-square&labelColor=1a1a2e" alt="7/7 Violations" />
<img src="https://img.shields.io/badge/Tests-269%20Passing-22c55e?style=flat-square&labelColor=1a1a2e" alt="269 Tests" />
<img src="https://img.shields.io/badge/VRAM-0.023%20GB%20Allocated-3b82f6?style=flat-square&labelColor=1a1a2e" alt="VRAM" />

</div>

---

<div align="center">

**AI-assisted traffic violation detection that retrofits onto any existing CCTV infrastructure.**  
**Officers verify. AI assists. Rule 166A compliant. ASTraM-ready.**

</div>

---

## The Problem

<div align="center">
<img src="docs/assets/problem-stats.svg" alt="75 AI junctions vs 500+ manual surveillance junctions" width="780" />
</div>

Bengaluru has 75 AI-enabled junctions covering approximately 87% contactless enforcement. The remaining 500+ junctions depend entirely on manual surveillance -- no automated detection, no evidence generation, no e-challan pipeline. Officers monitor live feeds and file reports by hand.

**The enforcement gap is structural, not technological.** Existing AI cameras cover high-traffic corridors but cannot be retrofitted to the 500+ remaining junctions without capital expenditure. Manual surveillance produces inconsistent evidence, delayed challans, and low conviction rates in traffic courts.

**VigilAI retrofits onto any existing CCTV feed.** No hardware upgrade. No new cameras. No RTSP reconfiguration. Upload an image, get violations, evidence, and license plates in under 1.2 seconds. The system is designed for incremental deployment -- one junction at a time, with zero integration friction.

---

## The Solution: Augmented Enforcement

<div align="center">
<img src="docs/assets/pipeline-flow.svg" alt="CCTV to Evidence pipeline" width="780" />
</div>

> **AI assists, doesn't replace officers.** VigilAI detects violations. Officers verify and approve. The system maintains a full audit trail, generates court-admissible evidence packages with SHA-256 integrity hashes, and integrates with BTP's existing ASTraM/Vahan infrastructure.

### How It Works

| Step | Component | Description |
|------|-----------|-------------|
| 1 | **Image Ingestion** | Upload via REST API or stream from CCTV capture. JPEG, PNG, WebP up to 10 MB. |
| 2 | **Preprocessing** | CLAHE contrast enhancement, Gaussian denoise, gamma correction. Handles low-light and noisy feeds. |
| 3 | **Object Detection** | YOLOv8n on CUDA. Detects persons, two-wheelers, cars, buses, trucks, bicycles, helmets, no-helmets. |
| 4 | **Violation Logic** | Head-region IoU (helmet), 2D spatial constraints (triple riding), zone polygons (parking, wrong-side, stop-line), windshield crop classifier (seatbelt), operator signal toggle (red-light). |
| 5 | **Plate OCR** | On-demand plate model load. RapidOCR on CPU with Indian plate regex post-processing (KA##XX####). |
| 6 | **Evidence Generation** | Annotated image with bboxes, labels, timestamps. SHA-256 hash on saved JPEG bytes. Chain-of-custody metadata. |

---

## System Architecture

<div align="center">
<img src="docs/assets/architecture.svg" alt="Three-layer architecture: React Frontend, FastAPI Backend, CV Pipeline" width="780" />
</div>

### Production Scale Model

```
Edge Node (Jetson/RTX 3050)    Cloud Aggregator (FastAPI+GPU)    BTP ASTraM / Vahan
  Per junction                      Central processing               E-challan + DB
  1 FPS capture                     Model serving                    Govt integration
```

The hackathon build is a vertical slice of this production architecture. Same models, same violation logic, same evidence format -- deployed on a single machine.

---

## Violation Coverage: 7/7

<div align="center">
<img src="docs/assets/violation-coverage.svg" alt="All 7 violation types with detection approach and MV Act sections" width="780" />
</div>

### Detection Approach Tiers

| Tier | Meaning | Violations | Notes |
|------|---------|-----------|-------|
| **Primary** | Production-grade accuracy on single images | Helmet, Triple riding, License plate OCR | Proven models, well-tested algorithms |
| **Heuristic** | Zone/polygon-based detection, configurable per camera | Wrong-side, Illegal parking, Stop-line | Works with calibrated cameras; accuracy depends on polygon configuration |
| **Best-effort** | Detection under favorable conditions, lower confidence expected | Seatbelt, Red-light | Seatbelt: limited by overhead camera angle. Red-light: requires operator signal input. |

### Helmet Non-Compliance (Head-Region Spatial Association)

Instead of naive bbox overlap, we extract the **top 30% of each person bbox** as the head region and compute IoU against helmet/no-helmet detections. Persons are first associated with two-wheelers by checking if their center falls within a two-wheeler bbox with a 5% margin.

```
Person Bbox (full height)
+------------------+
|   HEAD REGION    | <-- Top 30% (anatomically constrained)
+------------------+
|                  |
|     TORSO        |
|                  |
|     LEGS         |
+------------------+

IoU >= 0.15 with helmet    --> COMPLIANT
IoU >= 0.15 with no_helmet --> VIOLATION (conf = no_helmet.confidence)
Nothing overlaps head      --> VIOLATION (conservative, conf *= 0.8)
```

### Triple Riding (2D Spatial Constraints)

Three persons on one two-wheeler detected when: (1) horizontal center of each person is within the two-wheeler bbox, (2) vertical overlap between riders exceeds 30%, (3) minimum 3 persons associated with a single vehicle.

### License Plate OCR (Two-Stage Pipeline)

```
Stage 1: YOLOv8n Plate Detection  --> Plate bounding boxes (on-demand CUDA load)
Stage 2: RapidOCR (CPU, ONNX)     --> Text extraction + Indian KA##XX#### regex
```

RapidOCR runs exclusively on CPU with `OMP_NUM_THREADS=4` and `ONNX_NUM_THREADS=4`. ONNX Runtime verified to have NO CUDA provider. Post-processing handles O/0 confusion, I/1 confusion, and missing spaces common in Indian plate OCR.

---

## VRAM Strategy

<div align="center">
<img src="docs/assets/vram-budget.svg" alt="VRAM budget breakdown showing resident and on-demand models fitting in 4GB" width="780" />
</div>

| Component | VRAM | Mode | When |
|-----------|------|------|------|
| YOLOv8n COCO+Helmet | ~1.5 GB | **Resident** | Always loaded after startup with dummy inference pre-warm |
| YOLOv8n Plate | ~0.8 GB | **On-demand** | Load, infer, unload, gc.collect(), empty_cache() |
| YOLOv11s Seatbelt | ~0.8 GB | **On-demand** | Same load/unload protocol as plate model |
| RapidOCR | 0 GB | **CPU only** | Never touches GPU. ONNX Runtime with 4 threads. |
| PyTorch Context | ~0.5 GB | Resident | Base CUDA overhead |

---

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Object Detection | YOLOv8n (Ultralytics) | Smallest YOLOv8 variant, ~6 MB weights, < 1.5 GB VRAM |
| OCR | RapidOCR (ONNX Runtime) | CPU-only, 3-5x faster than PaddleOCR, no PaddlePaddle dependency |
| Backend | FastAPI + SQLAlchemy 2.0 + SQLite | Async, auto-docs, zero-config DB |
| Frontend | React 19 + Vite 6 + TailwindCSS v4 | Latest stable, fast HMR, utility-first CSS |
| Components | shadcn/ui | Copy-paste, no runtime cost, Tailwind-native |
| State | Zustand | Minimal boilerplate, demo mode flag |
| Charts | Recharts | React-native, lightweight |
| Maps | React-Leaflet + CartoDB Dark | No API key required, dark theme |

### Why Not PaddleOCR / ByteTrack / PostgreSQL / Next.js

| Rejected | In Favor Of | Reason |
|----------|-------------|--------|
| PaddleOCR | RapidOCR | PaddleOCR requires PaddlePaddle framework (heavy). RapidOCR is ONNX-only (lightweight). |
| ByteTrack | Spatial association | Single image processing -- no tracking needed. |
| PostgreSQL | SQLite | No network overhead for demo. Zero-config. |
| Next.js | Vite + React | No SSR needed. Simpler setup, faster iteration. |

---

## Confidence Tiers

<div align="center">
<img src="docs/assets/confidence-tiers.svg" alt="High, Medium, Low confidence tiers with thresholds and action" width="780" />
</div>

Each detection is classified into a confidence tier that drives the officer review workflow:

| Tier | Range | Officer Action | Expected FP Rate |
|------|-------|---------------|-----------------|
| **HIGH** | >= 0.80 | Auto-queue for standard review | < 5% |
| **MEDIUM** | 0.50 - 0.79 | Queue with attention flag, check edge cases | 5-15% |
| **LOW** | < 0.50 | Manual verification required, may be noise | > 15% |

Seatbelt violations receive an automatic 0.7x confidence discount due to overhead camera angle limitations, and are flagged as "review recommended" in the UI.

---

## API Contract

### POST /api/v1/detect

```http
POST /api/v1/detect HTTP/1.1
Content-Type: multipart/form-data

image: <binary image file (JPEG/PNG/WebP, max 10MB)>
camera_id: <optional string>
```

**Response 200:**

```json
{
  "success": true,
  "image_id": "img_20260616_143022_a3f2",
  "violations": [
    {
      "violation_id": "v_20260616_143022_001",
      "type": "no_helmet",
      "confidence": 0.87,
      "confidence_tier": "high",
      "bbox": [0.42, 0.15, 0.58, 0.35],
      "person_bbox": [0.35, 0.10, 0.65, 0.85],
      "mv_act_section": "129",
      "fine_amount": 500,
      "evidence_url": "/evidence/v_20260616_143022_001.jpg",
      "license_plate": null
    }
  ],
  "pipeline_timing": {
    "preprocessing_ms": 45,
    "detection_ms": 187,
    "violation_logic_ms": 12,
    "ocr_ms": 234,
    "evidence_gen_ms": 89,
    "total_ms": 567
  }
}
```

### Full Endpoint Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/detect` | Upload image, detect violations, generate evidence |
| `GET` | `/api/v1/violations` | List violations with filtering and pagination |
| `GET` | `/api/v1/violations/{id}` | Get violation details |
| `POST` | `/api/v1/violations/{id}/action` | Approve or reject a violation |
| `GET` | `/api/v1/evidence/{id}` | Get annotated evidence image |
| `GET` | `/api/v1/evidence/{id}/metadata` | Get chain-of-custody metadata |
| `GET` | `/api/v1/analytics` | Get violation statistics and trends |
| `GET` | `/api/v1/challan/{id}` | Generate FIR-style challan PDF |
| `GET` | `/api/v1/cameras` | List registered camera feeds |
| `GET` | `/health` | Health check |

### Error Responses

```json
{ "success": false, "error": "INVALID_IMAGE",    "detail": "Supported: JPEG, PNG, WebP." }
{ "success": false, "error": "IMAGE_TOO_LARGE",  "detail": "Exceeds 10MB limit." }
{ "success": false, "error": "MODEL_NOT_READY",   "detail": "Model loading. Retry in 5s." }
{ "success": false, "error": "INFERENCE_FAILED",  "detail": "Pipeline error. See logs." }
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 22+
- CUDA-capable GPU (4 GB+ VRAM recommended)

### Backend

```bash
# Virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate      # Linux/Mac

# Dependencies
pip install -r requirements.txt

# Model weights (if not present)
python scripts/setup_weights.py

# Seed demo data (281 violations at 10 Bengaluru junctions)
python scripts/seed_bengaluru_demo.py

# Start server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at `http://localhost:5173`

### Demo Mode

Toggle the **DEMO** badge in the header to switch between live backend and hardcoded responses. No backend required in demo mode.

---

## Project Structure

```
Round 2/
├── configs/
│   └── default.yaml           # Model paths, thresholds, lane polygons, camera config
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + lifespan (pre-warm, cleanup)
│   │   ├── config.py          # Pydantic Settings
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── routes/            # detect, violations, evidence, analytics, challan, cameras
│   │   ├── core/              # CV pipeline: preprocessing, detector, violations, ocr, evidence
│   │   └── db/                # SQLite engine + SQLAlchemy ORM models
│   ├── tests/                 # 211 backend tests
│   └── weights/               # Pre-trained model weights (YOLOv8n, helmet, plate, seatbelt)
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Upload, Violations, Evidence, Analytics, Map
│   │   ├── components/        # Layout, AnnotatedViewer, HeatmapLayer, ASTraMAlertFeed
│   │   ├── lib/               # API client
│   │   └── types/             # TypeScript types (mirrors Pydantic schemas)
│   └── package.json
├── data/
│   ├── sample_images/         # Demo traffic camera images
│   └── sample_videos/         # Test video clips
├── outputs/
│   └── evidence/              # Generated annotated evidence images (SHA-256 hashed)
├── docs/
│   ├── assets/                # SVG diagrams for README
│   ├── plan.md                # Master plan
│   ├── phase-1-cv-pipeline.md
│   ├── phase-2-backend.md
│   ├── phase-3-frontend.md
│   ├── tech-stack.md
│   └── violations-spec.md
└── scripts/
    ├── setup_weights.py       # Download model weights
    ├── seed_bengaluru_demo.py # Seed 281 violations at 10 Bengaluru junctions
    └── eval_metrics.py        # mAP, Precision, Recall, F1, OCR accuracy evaluation
```

---

## Performance Metrics

<div align="center">
<img src="docs/assets/performance-metrics.svg" alt="Latency, VRAM, OCR accuracy, test count" width="780" />
</div>

| Metric | Value | Target |
|--------|-------|--------|
| End-to-end latency | ~1.2s per image | < 3s |
| VRAM allocated | 0.023 GB | < 3.5 GB |
| OCR character accuracy | 100% (synthetic KA plates) | > 90% |
| Backend tests | 211 passing | -- |
| Frontend tests | 58 passing | -- |
| Total test suite | 269 passing | -- |

### Evaluation Protocol

Run full pipeline evaluation with:

```bash
python scripts/eval_metrics.py
```

Computes mAP@50, Precision, Recall, F1 per violation type, OCR accuracy on labeled test set, and inference FPS on RTX 3050.

---

## ROI Projection

<div align="center">
<img src="docs/assets/roi-projection.svg" alt="Conservative Rs.219 Cr/yr and Aggressive Rs.438 Cr/yr ROI" width="780" />
</div>

| Metric | Conservative | Aggressive |
|--------|-------------|------------|
| Junctions | 500 | 500 |
| Violations/day | 40,000 | 80,000 |
| Annual recovery | Rs.219 Cr | Rs.438 Cr |
| Investment | Rs.2.5 Cr | Rs.2.5 Cr |
| Payback period | < 1 week | < 1 week |
| Year 1 ROI | 87x | 175x |

> "Conservative assumes 50% detection effectiveness vs existing BTP AI cameras. Aggressive assumes parity with current system." -- Based on 30% fine compliance rate and average Rs.500/violation.

---

## Demo Data

### Bengaluru Junctions (10 locations)

| Junction | Coordinates | Avg Violations/Day | Primary Violations |
|----------|------------|-------------------|-------------------|
| MG Road - Trinity Circle | 12.9758, 77.6045 | 45 | No helmet (65%) |
| Silk Board Junction | 12.9177, 77.6238 | 62 | Triple riding (30%) |
| Hebbal Flyover | 13.0358, 77.5970 | 38 | No helmet (70%) |
| Whitefield Main Road | 12.9698, 77.7500 | 41 | Triple riding (25%) |
| Electronic City Phase 1 | 12.8456, 77.6603 | 55 | Wrong-side (35%) |
| Marathahalli Bridge | 12.9591, 77.6974 | 48 | Illegal parking (28%) |
| KR Puram Railway Junction | 12.9970, 77.6844 | 36 | Stop-line (22%) |
| Yelahanka New Town | 13.1007, 77.5963 | 25 | No helmet (72%) |
| Bannerghatta Road - Jayadeva | 12.9135, 77.5985 | 42 | Wrong-side (26%) |
| Koramangala 100ft Road | 12.9352, 77.6245 | 33 | No helmet (68%) |

### License Plate Format

All plates follow Karnataka RTO format: `KA##XX####` where `KA` is the state code, `##` is the district code, `XX` is the series, and `####` is the number. Example: `KA01AB1234`, `KA05MZ9876`.

---

## Testing

```bash
# Backend tests (fast unit tests only)
python -m pytest backend/tests/ -v -m "not slow"

# Backend tests (full suite including GPU inference)
python -m pytest backend/tests/ -v

# Frontend tests
cd frontend && npx vitest run

# Full evaluation with metrics
python scripts/eval_metrics.py
```

---

## Key Differentiators

| Feature | What It Proves |
|---------|---------------|
| **Working prototype** | Others submit concept notes. We submit running code. |
| **Head-region helmet association** | Novel algorithm, not naive bbox overlap. |
| **Bengaluru-specific data** | Real junctions, KA plates, local enforcement context. |
| **Command Center aesthetic** | Dark navy layout with BTP badge and IST clock. |
| **Approve/Reject workflow** | Human-in-the-loop, not autonomous surveillance. |
| **Pipeline waterfall chart** | Transparency -- shows exactly where time is spent. |
| **ROI calculator** | Defensible numbers with methodology. |
| **Evidence viewer** | FIR-style layout, SHA-256 hash, print-ready. |
| **Audit trail** | Every action logged -- officer accountability. |
| **ASTraM-ready** | E-challan integration path to BTP infrastructure. |

---

## License

Built for Flipkart GridLock 2.0 hackathon.
