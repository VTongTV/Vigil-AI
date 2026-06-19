# VigilAI — Master Plan v2 (After Round 2 Refinement)

> **Track:** 3 — Automated Photo Identification and Classification for Traffic Violations Using CV
> **Hackathon:** Flipkart GridLock 2.0, Round 2 (Prototype Phase)
> **Deadline:** June 21, 2026, 11:59 PM IST
> **Team:** Vedant Tong (solo)
> **Hardware:** RTX 3050 Laptop (4GB VRAM), 16GB RAM, Windows 11

---

## 1. Product Vision

**VigilAI** is an AI-powered traffic violation detection system for **Bengaluru Traffic Police**. It processes traffic camera images/videos to detect violations, read license plates, generate court-admissible evidence, and display results on a real-time command center dashboard.

**Differentiator:** Most Track 3 submissions are concept notes. We deliver a **working prototype** with a production-grade BTP dashboard.

**Winning Narrative:** "87% of BTP violations are now contactless, but only 75 junctions have AI cameras. VigilAI retrofits onto ANY existing CCTV — scaling from 75 to 500+ junctions at 1/30th the cost. Projected annual fine recovery: **₹182 Cr**."

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              VigilAI Command Center (React)                   │
│  Dashboard │ Upload │ Violations │ Evidence │ Analytics      │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend                             │
├─────────────────────────────────────────────────────────────┤
│  Preprocessing → Detection → Violation Rules → OCR           │
│    (OpenCV)      (YOLOv8n)     (Rule Engine)   (RapidOCR)   │
├─────────────────────────────────────────────────────────────┤
│  Evidence Generator → SQLite DB → Audit Trail                │
│  Pipeline Waterfall (timing breakdown per stage)             │
└─────────────────────────────────────────────────────────────┘

Production Architecture (narrative only, not built):
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ Edge Node    │ ──→ │ Cloud Agg.   │ ──→ │ BTP ASTraM       │
│ (YOLOv8n +   │     │ (FastAPI +   │     │ Vahan DB Lookup   │
│  RapidOCR)   │     │  PostgreSQL) │     │ e-Challan System  │
│ ₹25K/junction│     │              │     │ MapmyIndia Maps   │
└──────────────┘     └──────────────┘     └──────────────────┘
```

---

## 3. Violation Detection Scope

### P0 — Must-Have (Core Demo)

| Violation | Approach |
|-----------|----------|
| **Helmet non-compliance** | YOLOv8n (COCO) for vehicle/person + pre-trained helmet model |
| **Triple riding** | Person bbox horizontal-center clustering within motorcycle bbox ± buffer |

### P1 — Should-Have (Demo Polish)

| Violation | Approach |
|-----------|----------|
| **License plate OCR** | Two-stage: YOLOv8n plate detection → RapidOCR (ONNX, PP-OCRv4 models) on CPU |
| **Illegal parking** | Configurable polygon zones + dwell time tracking |

### DROPPED
- No seatbelt (not feasible from overhead cameras)
- Red-light violation (UI placeholder only)
- SSE video progress (replaced with simple upload)
- Full review queue (replaced with Approve/Reject on cards)

---

## 4. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Detection | YOLOv8n (ultralytics) | 195 FPS, ~0.15GB FP16 |
| Helmet | Pre-trained from Roboflow/HuggingFace | mAP 74-83% |
| Plate Detection | YOLOv8n from Roboflow (mAP 97.2%) | Best pre-trained |
| OCR | **RapidOCR** v1.4.4 (ONNX Runtime, CPU) | No PaddlePaddle dep, Windows-safe, same PP-OCRv4 models |
| Tracking | ByteTrack (built into ultralytics) | Persistent track IDs |
| Preprocessing | OpenCV (CLAHE, denoise, gamma) | +2-5% mAP |
| Backend | FastAPI + uvicorn | Async, auto-docs |
| Database | SQLite + SQLAlchemy (sync) | Simple |
| Frontend | React 19 + Vite + TailwindCSS + shadcn/ui | Fast build |
| Charts | Recharts | React-native |
| Map | react-leaflet + CartoDB Dark Matter tiles | Command center aesthetic |
| State | Zustand | Lightweight |
| PDF/Challan | fpdf2 or reportlab | E-challan generation |

---

## 5. VRAM Strategy (Revised)

**Key Change from v1: Keep COCO + Helmet models always loaded; load plate model on-demand only.**

| Component | VRAM | Notes |
|-----------|------|-------|
| CUDA context | ~0.7 GB | Windows overhead |
| YOLOv8n COCO (resident) | ~0.4 GB | Always loaded |
| YOLOv8n helmet (resident) | ~0.4 GB | Always loaded (was on-demand in v1) |
| YOLOv8n plate (on-demand) | ~0.4 GB | Loaded only when vehicle detected, then unloaded |
| Input buffers | ~0.3 GB | Image tensors |
| **Peak (2 resident + context + buffers)** | **~1.8 GB** | **2.2 GB headroom** |

**Loading strategy:**
1. Load COCO + Helmet models at startup (always resident) → ~1.5 GB
2. Pre-warm both models with a dummy inference at startup (eliminates first-call JIT latency)
3. Load plate model only when vehicle detected → run inference → unload → `empty_cache()`
4. Run RapidOCR on **CPU** (no VRAM cost, ~200ms per plate)
5. This gives ~2.2 GB headroom — enough for plate model load/unload cycles

---

## 6. Data Schema Contract (Defined Before Code)

Both the seed data generator AND the CV pipeline MUST produce identical structures:

```python
# Shared contract — define FIRST, implement SECOND
class ViolationRecord(BaseModel):
    id: str                          # UUID
    violation_type: str              # "no_helmet" | "triple_riding" | "illegal_parking"
    confidence: float                # 0.0-1.0
    confidence_tier: str             # "high" (>0.8) | "medium" (0.5-0.8) | "low" (<0.5)
    status: str                      # "auto_flagged" | "officer_approved" | "rejected"
    image_url: str                   # Path to annotated evidence image
    original_image_url: str          # Path to original uploaded image
    license_plate: str | None        # Plate text or None
    plate_confidence: float | None    # OCR confidence
    mv_act_section: str             # e.g., "Section 129" for no helmet
    fine_amount: int                 # ₹500 / ₹1000 / ₹200
    camera_id: str                   # e.g., "CAM-BLR-042"
    location_name: str               # e.g., "Silk Board Junction"
    latitude: float                  # GPS latitude
    longitude: float                 # GPS longitude
    timestamp: datetime              # ISO 8601
    evidence_hash: str               # SHA-256 of annotated image
    data_source: str                 # "seeded" | "live" — for debugging
    audit_events: list[AuditEvent]  # Chain of custody
    timing_breakdown: dict | None    # Pipeline waterfall (live only)

class AuditEvent(BaseModel):
    timestamp: datetime
    event_type: str                  # "capture" | "preprocess" | "detect" | "classify" | "ocr" | "evidence" | "store"
    details: str
    duration_ms: int | None
```

**TypeScript mirror** in `frontend/src/types/index.ts` must match exactly.

---

## 7. Phase-Wise Build Plan (REVISED — Realistic Estimates)

### PRE-BUILD (1.5-2 hours — DO THIS BEFORE DAY 1)
- [ ] Create venv, install ALL deps (pin `rapidocr-onnxruntime==1.4.4`)
- [ ] Download YOLOv8n.pt COCO weights
- [ ] Download helmet model weights
- [ ] Download plate detection model weights
- [ ] **VERIFY**: `python -c "from rapidocr_onnxruntime import RapidOCR; ocr=RapidOCR(); print('OK')"` — if fails, try `pip install rapidocr` as fallback
- [ ] **VERIFY**: Load COCO + helmet models simultaneously, run inference, check `nvidia-smi`
- [ ] **VERIFY**: Run full pipeline on 3-5 test Indian traffic images
- [ ] Curate 5 test images that work with the models
- [ ] Define data schema contract (Pydantic + TypeScript types)
- [ ] Scaffold project directory structure

### Phase 1: CV Pipeline Core (Day 1, Hours 0-8) — REDUCED SCOPE
- [ ] `configs/default.yaml` + `config.py` + `schemas.py` (shared contract)
- [ ] `preprocessing.py` (CLAHE, denoise, gamma)
- [ ] `detector.py` (YOLOv8 wrapper: COCO + helmet resident, plate on-demand)
- [ ] `violations.py` (helmet + triple riding with horizontal-center clustering)
- [ ] `evidence.py` (annotated image generation + SHA-256 hash)
- [ ] **Pipeline Waterfall**: Add `time.perf_counter()` around each stage, return timing_breakdown
- [ ] **GATE (Hour 8)**: Test on 5 curated images. Go/No-Go decision:
  - ✅ Pipeline works → proceed to Phase 2 with OCR integration
  - ❌ Pipeline fails → commit to demo mode, skip OCR, focus on frontend

### Phase 2: Backend API + Seed Data (Day 1, Hours 8-14)
- [ ] FastAPI app with lifespan (load COCO + helmet at startup, pre-warm)
- [ ] Routes: detect, violations (CRUD + approve/reject), evidence, analytics
- [ ] SQLite schema matching data contract
- [ ] `ocr.py` (RapidOCR on CPU + Indian plate regex validation)
- [ ] Wire OCR to detection pipeline
- [ ] Audit trail events in DB
- [ ] `scripts/seed_bengaluru_demo.py` — 200-300 violations at 8-10 real Bengaluru junctions
- [ ] **GATE**: All API endpoints return seeded data correctly

### Phase 3: Frontend Core (Day 2, Hours 0-8)
- [ ] Scaffold React + Vite + Tailwind + shadcn/ui
- [ ] **Command Center Layout** (dark navy, ticking IST clock, BTP badge, "SYSTEM OPERATIONAL" status, scanline texture)
- [ ] Dashboard page:
  - Stats cards with count-up animation
  - ROI Calculator with ₹182 Cr scale projection
  - Pipeline Waterfall visualization
  - Recent violations feed
- [ ] Upload page (image upload → detection → bbox overlay → violation cards)
- [ ] Evidence viewer (split panel: annotated canvas + FIR-style metadata + Print Evidence)
- [ ] Violation cards with Approve/Reject buttons + confidence badges
- [ ] **One Junction Live Feed** toggle (progressive reveal from seeded data)
- [ ] **GATE**: Upload image → see violations → approve/reject → view evidence

### Phase 4: Polish + Submission Prep (Day 2, Hours 8-14)
- [ ] Violations table page (filter by type, confidence, date, status)
- [ ] Analytics page (Recharts: by type, time trends, junction breakdown)
- [ ] Map page (CartoDB Dark tiles, Bengaluru jurisdiction polygon, violation markers)
- [ ] Confidence Threshold Playground (slider + FP/FN tradeoff chart)
- [ ] E-Challan styled view (fine amounts, MV Act sections, QR mock)
- [ ] Demo mode toggle (pre-computed results fallback)
- [ ] Curate 15-20 demo images (confirmed working)
- [ ] **Submission deliverables**:
  - 10-slide presentation (problem → architecture → demo → integration → scale → impact)
  - 2-minute video walkthrough
  - README.md with one-command setup
  - Push to GitHub
  - Screenshots for HackerEarth
- [ ] Final end-to-end test

### Phase 5: Final Prep (Day 2, Hours 14-16)
- [ ] Test 3 "guaranteed working" demo images on actual machine
- [ ] Record backup demo video
- [ ] Submit to HackerEarth
- [ ] Polish any remaining UI details

---

## 8. Key Differentiators (v2 — After 2 Rounds of Refinement)

### Core Differentiators (Built into Product)

| # | Feature | Effort | Why It Wins |
|---|---------|--------|-------------|
| 1 | Working prototype (not concept note) | — | Only team that actually built something |
| 2 | Bengaluru-calibrated demo data | LOW | Judges see their city, their junctions |
| 3 | ROI Calculator + ₹182 Cr scale projection | LOW | Speaks budget language |
| 4 | Command Center aesthetic | LOW | Feels like a real police tool |
| 5 | Evidence viewer as legal document | MEDIUM | FIR-style, SHA-256, Print Evidence |
| 6 | Approve/Reject on violation cards | MEDIUM | Addresses due process concern |
| 7 | Pipeline Waterfall (latency breakdown) | LOW | Proves real engineering, not glued demos |
| 8 | Confidence Threshold Playground | LOW | Addresses false positive fear |
| 9 | One Junction Live Feed | LOW-MED | Makes dashboard feel alive |
| 10 | Dark map tiles + Bengaluru polygon | LOW | Professional command center look |
| 11 | E-Challan styled view | MEDIUM | Closes the workflow loop |
| 12 | Audit trail with chain of custody | MEDIUM | Court-ready evidence |

### Narrative Differentiators (Slides/Presentation Only)

| # | Feature | Effort | Why It Wins |
|---|---------|--------|-------------|
| 1 | BTP integration references (ASTraM, Vahan) | LOW | Shows we read the brief |
| 2 | Scalability deployment diagram | LOW | 1 laptop → 500 cameras path |
| 3 | MapmyIndia as mapping partner reference | LOW | Acknowledges hackathon sponsor |
| 4 | "AI assists, doesn't replace officers" narrative | FREE | Addresses BTP's #1 fear |
| 5 | Cost comparison (₹50K retrofit vs ₹15L new camera) | FREE | Speaks procurement language |

---

## 9. Demo Strategy (Refined)

**Opening (30 seconds):**
"87% of BTP violations are now contactless, but only 75 junctions have AI cameras. VigilAI retrofits onto ANY existing CCTV — scaling to 500+ junctions at 1/30th the cost. Projected annual fine recovery: ₹182 Cr."

**Live Demo (3 minutes):**
1. Show dashboard with Bengaluru data (stats, ROI calculator with ₹182 Cr number, pipeline waterfall)
2. Enable "One Junction Live" — Silk Board, violations appearing in real-time
3. Upload a curated image → 2-second processing → violation detected + pipeline waterfall shows timing
4. Show evidence viewer with FIR-style metadata, SHA-256 hash, Approve/Reject buttons
5. Show Confidence Threshold Playground — drag slider, see FP/FN tradeoff
6. Show e-challan view with fine amount + MV Act section

**Close (30 seconds):**
"Runs on ₹25K GPU per junction. Rule 167A compliant. Officer-verified. Ready to integrate with ASTraM and Vahan. Deploy in weeks, not years."

**Backup Plan:** If live detection fails → demo mode (seeded data). Dashboard still works, just skip upload step. 2-minute pre-recorded video as ultimate fallback.

---

## 10. Go/No-Go Decision Points

| Time | Decision | If No-Go |
|------|----------|----------|
| PRE-BUILD | RapidOCR works on Windows? | Switch to EasyOCR |
| PRE-BUILD | 2 YOLO models fit in VRAM? | Sequential loading (add ~1s latency) |
| Phase 1 Hour 8 | CV pipeline works on 5 test images? | → Demo mode (seeded data only, skip OCR) |
| Phase 2 Hour 14 | API returns seeded data correctly? | Hardcode mock data in frontend |
| Phase 3 Hour 8 | Upload → detect → display works? | Skip upload, show dashboard only |
| Phase 4 Hour 14 | Full demo works? | Record video walkthrough as submission |

---

## 11. Submission Deliverables Checklist

| Item | Format | Max Size | Status |
|------|--------|----------|--------|
| Project title | Text | — | "VigilAI — AI-Powered Traffic Violation Detection" |
| Project description | Text | — | Must write (problem, solution, impact) |
| Built with | Text | — | YOLOv8, RapidOCR, FastAPI, React, etc. |
| Screenshots | JPG/PNG | 3MB each | Need 3-5 screenshots |
| Video link | YouTube/Vimeo | — | 2-min walkthrough |
| Presentation | PDF | 50MB | 10 slides |
| Source code | ZIP | 50MB | Exclude venv, node_modules, .pt weights |
| README | Markdown | — | One-command setup instructions |
| Demo link | URL | — | ngrok or Vercel |

---

## 12. 12-Hour Cut Plan (If Behind Schedule)

If only 12 hours total:

| Keep | Cut |
|------|-----|
| Dashboard with seeded data | Map page |
| Upload → detect helmet violation | Analytics charts |
| BTP command center layout | E-Challan view |
| Evidence viewer (basic) | Confidence Playground |
| Pipeline Waterfall | One Junction Live Feed |
| Approve/Reject buttons | Audit trail export |

**Minimum viable demo:** Upload image → YOLO detects vehicles/persons → helmet violation flagged → saved to DB → dashboard shows stats with Bengaluru data. **That's still better than 90% of submissions.**

---

## 13. Risk Register (Updated)

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| RapidOCR install issues on Win | Low | Medium | Pin v1.4.4, test in pre-build, fallback to EasyOCR |
| VRAM OOM with 2 resident models | Low | High | Profile in pre-build, fallback to on-demand loading |
| Triple riding false positives | Medium | Medium | Horizontal-center clustering + curated images |
| Frontend takes too long | Medium | High | Cut to Dashboard + Upload + Evidence (3 pages) |
| Demo fails live | Medium | Critical | Demo mode toggle + backup video |
| Domain gap on Indian traffic | Medium | High | Curate 15-20 working images, acknowledge in presentation |
| Schema mismatch between seed+live | Low | Medium | Define contract first (Section 6) |
| Phase 1 overruns | Medium | High | Hard go/no-go at Hour 8, move to demo mode |
| Submission incomplete | Medium | Critical | Plan deliverables explicitly (Section 11) |

---

## 14. Key Metrics

| Metric | Target | How |
|--------|--------|-----|
| mAP@50 (helmet detection) | >0.74 | Pre-trained model baseline |
| OCR character accuracy | >90% | On curated demo images |
| Inference FPS (single image) | >25 FPS | RTX 3050, YOLOv8n |
| End-to-end latency (upload → result) | <3s | Pipeline waterfall optimization |
| Dashboard load time | <2s | Vite build optimization |
