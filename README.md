# VigilAI — AI-Powered Traffic Violation Detection

> Flipkart GridLock 2.0 | Round 2 | Track 3

AI-powered traffic violation detection system for Bengaluru Traffic Police. Processes CCTV imagery to detect 7 violation types, extract license plates via OCR, and generate court-admissible evidence packages.

---

## Problem

Bengaluru has 75 AI-enabled junctions covering ~87% contactless enforcement. The remaining 500+ junctions rely on manual surveillance. VigilAI retrofits onto **any** existing CCTV — no hardware upgrade needed.

## Solution

VigilAI detects violations. Officers verify and approve. The system provides an audit trail, evidence packages for challans, and integrates with BTP's existing ASTraM/Vahan infrastructure. AI assists, doesn't replace officers.

---

## Violation Coverage (7/7)

| Violation | MV Act Section | Fine | Approach |
|-----------|---------------|------|----------|
| Helmet non-compliance | Section 129 | 500 | Head-region spatial association |
| Triple riding | Section 184 | 1,000 | 2D spatial constraints |
| Wrong-side driving | Section 184 | 1,000 | Lane-position heuristic |
| Illegal parking | Section 122 | 200 | Zone-based polygon detection |
| Seatbelt non-compliance | Section 194B | 1,000 | Windshield crop + best-effort classifier |
| Stop-line violation | Section 184 | 1,000 | Zone heuristic |
| Red-light violation | Section 184 | 1,000 | Stop-line zone + signal input |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Object Detection | YOLOv8n (Ultralytics) |
| OCR | RapidOCR (ONNX Runtime, CPU) |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Frontend | React 18 + Vite 8 + Tailwind CSS v4 |
| Maps | React-Leaflet + CartoDB Dark |
| Charts | Recharts |
| State Management | Zustand |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 22+
- CUDA-capable GPU (4GB+ VRAM recommended)

### Backend

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate      # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Download model weights (if not present)
python scripts/setup_weights.py

# Seed demo data (281 violations at 10 Bengaluru junctions)
python scripts/seed_bengaluru_demo.py

# Start backend
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/detect | Upload image and detect violations |
| GET | /api/v1/violations | List violations with filtering and pagination |
| GET | /api/v1/violations/{id} | Get violation details |
| POST | /api/v1/violations/{id}/action | Approve or reject a violation |
| GET | /api/v1/evidence/{id} | Get annotated evidence image |
| GET | /api/v1/evidence/{id}/metadata | Get chain-of-custody metadata |
| GET | /api/v1/analytics | Get violation statistics and trends |
| GET | /health | Health check |

---

## Project Structure

```
Round 2/
├── AGENTS.md
├── docs/                      # Plans, specs, and tech documentation
├── requirements.txt
├── configs/
│   └── default.yaml           # Model paths, thresholds, API settings
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + lifespan
│   │   ├── config.py          # Pydantic Settings
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── routes/            # API route handlers
│   │   ├── core/              # CV pipeline modules
│   │   └── db/                # SQLite + SQLAlchemy ORM
│   ├── tests/                 # 211 backend tests
│   └── weights/               # Pre-trained model weights
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Upload, Violations, Evidence, Analytics
│   │   ├── components/        # Layout, ViolationCard, StatsBar, MapView
│   │   ├── lib/               # API client
│   │   └── types/             # TypeScript types (matches Pydantic schemas)
│   └── package.json
├── data/
│   ├── sample_images/         # Demo traffic camera images
│   └── sample_videos/         # Test video clips
├── outputs/
│   └── evidence/              # Generated annotated evidence images
└── scripts/
    ├── setup_weights.py       # Download model weights
    └── seed_bengaluru_demo.py # Seed 281 violations at 10 Bengaluru junctions
```

---

## Testing

```bash
# Backend tests (fast unit tests only)
python -m pytest backend/tests/ -v -m "not slow"

# Backend tests (full suite including GPU inference)
python -m pytest backend/tests/ -v

# Frontend tests (58 tests)
cd frontend && npx vitest run

# Performance evaluation
python scripts/eval_metrics.py
```

**Test counts:** 211 backend tests, 58 frontend tests.

---

## Demo Data

Run the seed script to populate the database with 281 violations across 10 real Bengaluru junctions:

```bash
python scripts/seed_bengaluru_demo.py
```

Junctions included: MG Road, Silk Board, Hebbal, Whitefield, Electronic City, Marathahalli, KR Puram, Yelahanka, Bannerghatta Road, and Koramangala.

---

## Performance Metrics

| Metric | Value | Target |
|--------|-------|--------|
| VRAM Usage | 0.023 GB allocated | < 3.5 GB |
| OCR Character Accuracy | 100% (synthetic plates) | > 90% |
| End-to-End Latency | ~1.2s per image | < 3s |

---

## License

This project was built for the Flipkart GridLock 2.0 hackathon.
