# VigilAI — Master Plan v1 (After Round 1 Refinement)

> **Track:** 3 — Automated Photo Identification and Classification for Traffic Violations Using CV
> **Hackathon:** Flipkart GridLock 2.0, Round 2 (Prototype Phase)
> **Deadline:** June 21, 2026, 11:59 PM IST
> **Team:** Vedant Tong (solo)
> **Hardware:** RTX 3050 Laptop (4GB VRAM), 16GB RAM, Windows 11

---

## 1. Product Vision

**VigilAI** is an AI-powered traffic violation detection system for **Bengaluru Traffic Police**. It processes traffic camera images/videos to detect violations, read license plates, generate court-admissible evidence, and display results on a real-time command center dashboard.

**Differentiator:** Most Track 3 submissions are concept notes. We deliver a **working prototype** with a production-grade BTP dashboard.

**Winning Narrative:** "87% of BTP violations are now contactless, but only 75 junctions have AI cameras. VigilAI retrofits onto ANY existing CCTV — scaling from 75 to 500+ junctions at 1/30th the cost."

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              VigilAI Dashboard (React)                    │
│  Dashboard │ Upload │ Violations │ Evidence │ Analytics  │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                          │
├──────────────────────────────────────────────────────────┤
│  Preprocessing → Detection → Violation Rules → OCR       │
│    (OpenCV)      (YOLOv8n)    (Rule Engine)   (RapidOCR) │
├──────────────────────────────────────────────────────────┤
│  Evidence Generator → SQLite DB → Audit Trail            │
└──────────────────────────────────────────────────────────┘
```

**Key Architecture Decisions (from Round 1 refinement):**
- **RapidOCR instead of PaddleOCR** — Same PP-OCRv4 models, ONNX Runtime, no PaddlePaddle dependency, works on Windows out-of-box
- **Sequential model loading** — Only 1-2 YOLO models in VRAM at a time; OCR runs on CPU to save VRAM
- **Build backwards from seeded data** — Dashboard works on Day 2 morning even if CV pipeline isn't done

---

## 3. Violation Detection Scope (Cut from v0)

### P0 — Must-Have (Core Demo, ~80% of demo time)

| Violation | Approach | Key Change from v0 |
|-----------|----------|-------------------|
| **Helmet non-compliance** | YOLOv8n (COCO) for vehicle/person + pre-trained helmet model (Roboflow/HuggingFace) | No change |
| **Triple riding** | Count persons whose bbox **horizontal center** falls within motorcycle bbox ± buffer, NOT IoU | **CHANGED**: IoU broken for overhead cameras; horizontal-center clustering is correct |

### P1 — Should-Have (Demo Polish)

| Violation | Approach | Key Change from v0 |
|-----------|----------|-------------------|
| **License plate OCR** | Two-stage: YOLOv8n plate detection → **RapidOCR** (ONNX, PP-OCRv4 models) | **CHANGED**: PaddleOCR → RapidOCR; OCR on CPU to save VRAM |
| **Illegal parking** | Configurable polygon zones + dwell time tracking | No change |

### DROPPED from v0

| Violation | Reason |
|-----------|--------|
| **No seatbelt** | Not feasible from overhead traffic cameras (research-confirmed) |
| **Red-light violation** | UI placeholder only — needs video + signal context |
| **SSE video progress** | Dropped; use simple spinner + results reveal |

---

## 4. Tech Stack (Refined from v0)

| Layer | Technology | Change from v0 | Why |
|-------|-----------|---------------|-----|
| **Detection** | YOLOv8n (ultralytics) | No change | 195 FPS, ~0.15GB FP16 |
| **Helmet** | Pre-trained from Roboflow/HuggingFace | No change | mAP 74-83% |
| **Plate Detection** | YOLOv8n from Roboflow (mAP 97.2%) | No change | Best pre-trained |
| **OCR** | **RapidOCR** (ONNX Runtime) | **CHANGED from PaddleOCR** | No PaddlePaddle dependency, Windows-compatible, same PP-OCRv4 accuracy |
| **Tracking** | ByteTrack | No change | Built into ultralytics |
| **Preprocessing** | OpenCV (CLAHE, denoise, gamma) | No change | CLAHE = +2-5% mAP |
| **Backend** | FastAPI + uvicorn | No change | Async, auto-docs |
| **Database** | SQLite + SQLAlchemy (sync) | No change | Simple |
| **Frontend** | React 19 + Vite + TailwindCSS + shadcn/ui | No change | Fast build |
| **Charts** | Recharts | No change | React-native |
| **Map** | react-leaflet + **CartoDB Dark Matter tiles** | **CHANGED**: Dark tiles | Command center aesthetic |
| **State** | Zustand | No change | Lightweight |

---

## 5. VRAM Budget (Revised — Realistic Inference Numbers)

**Strategy: Sequential inference, OCR on CPU**

| Component | VRAM (Realistic) | Notes |
|-----------|-----------------|-------|
| CUDA context | ~0.7 GB | Windows overhead included |
| YOLOv8n COCO (loaded) | ~0.4 GB | During forward pass with feature maps |
| YOLOv8n helmet (loaded) | ~0.4 GB | Loaded only when needed |
| YOLOv8n plate (loaded) | ~0.4 GB | Loaded only when needed |
| Input buffers + frame | ~0.3 GB | Image tensors |
| **Peak (2 models + context)** | **~1.8 GB** | **2.2 GB headroom** |

**Loading Strategy:**
1. Load COCO model at startup (always resident)
2. Load helmet model when violation check starts, unload after
3. Load plate model only when vehicle detected, unload after
4. Run RapidOCR on **CPU** (no VRAM cost, ~200ms per plate — acceptable for demo)
5. Call `torch.cuda.empty_cache()` between model switches

---

## 6. Project Structure (Same as v0)

See v0 for full structure. No changes.

---

## 7. Phase-Wise Build Plan (REVISED — Aggressive Cuts)

### ⏱️ PRE-BUILD (Before Day 1 starts — saves 2-3 hours)
- [ ] Create venv at `D:\Web Project\Flipkart\Round 2\venv`
- [ ] Install ALL dependencies (ultralytics, rapidocr-onnxruntime, fastapi, uvicorn, opencv, etc.)
- [ ] Download YOLOv8n.pt COCO weights
- [ ] Download helmet model weights from Roboflow/HuggingFace
- [ ] Download plate detection model weights from Roboflow
- [ ] Verify RapidOCR works on Windows: `python -c "from rapidocr_onnxruntime import RapidOCR; print('OK')"`
- [ ] Verify VRAM: load 2 YOLO models simultaneously, run inference, check nvidia-smi
- [ ] Scaffold project directory structure

### Phase 1: Foundation + CV Pipeline (Day 1, Hours 0-8)
- [ ] Implement `configs/default.yaml` + `config.py`
- [ ] Implement `preprocessing.py` (CLAHE, denoise, gamma)
- [ ] Implement `detector.py` (YOLOv8 wrapper, sequential loading)
- [ ] Implement `violations.py` (helmet + triple riding with horizontal-center clustering)
- [ ] Implement `ocr.py` (RapidOCR + Indian plate regex validation)
- [ ] Implement `evidence.py` (annotated image generation with OpenCV)
- [ ] **GATE**: Test end-to-end on 5 sample Indian traffic images
- [ ] **VRAM checkpoint**: Profile peak usage with nvidia-smi

### Phase 2: Backend API + Seed Data (Day 1, Hours 8-14)
- [ ] Implement FastAPI app with lifespan (model loading)
- [ ] Implement routes: detect, violations, evidence, analytics
- [ ] Implement SQLite schema + ORM models
- [ ] **Wire CV pipeline to API endpoints**
- [ ] Implement audit trail (violation events in DB)
- [ ] Create `scripts/seed_bengaluru_demo.py` — 200-300 violations at 8-10 real Bengaluru junctions
- [ ] **GATE**: Swagger / curl tests pass on all endpoints
- [ ] **GATE**: Dashboard has data to display even without live detection

### Phase 3: Frontend Core (Day 2, Hours 0-8)
- [ ] Scaffold React + Vite + Tailwind + shadcn/ui
- [ ] **BTP Command Center Layout** (dark theme, ticking clock, BTP badge, status indicators)
- [ ] Dashboard page (stats cards with count-up, ROI calculator, recent violations)
- [ ] Upload page (image upload → detection results with bbox overlay)
- [ ] Evidence viewer (split panel: annotated image + FIR-style metadata, "Print Evidence" button)
- [ ] **GATE**: Upload image → see violations → view evidence → works end-to-end

### Phase 4: Polish + Integration (Day 2, Hours 8-14)
- [ ] Violations table page (filter by type, confidence, date)
- [ ] Analytics page (Recharts: violations by type, time trends, junction breakdown)
- [ ] Map page (CartoDB Dark tiles, Bengaluru jurisdiction polygon, violation markers with popups)
- [ ] Demo data seeded and dashboard populated
- [ ] E-Challan styled view (HTML page, not PDF — shows fine amounts, MV Act sections)
- [ ] End-to-end testing on curated demo images
- [ ] **DEMO MODE**: Pre-computed results fallback if live detection fails

### Phase 5: Final Prep (Day 2, Hours 14-16)
- [ ] Curate 15-20 demo images (confirmed working with pipeline)
- [ ] Record 2-minute walkthrough video as backup
- [ ] Final end-to-end test
- [ ] Submit

---

## 8. Demo Strategy (Refined)

**Opening (30 seconds):**
"Bengaluru Traffic Police detects 87% of violations contactlessly — but only at 75 junctions. What about the other 500+? VigilAI retrofits onto ANY existing CCTV camera."

**Live Demo (3 minutes):**
1. Show dashboard with Bengaluru data (stats, ROI calculator, map)
2. Upload a curated Indian traffic image → 2-second processing → violation detected
3. Show evidence viewer with court-admissible metadata (hash, timestamp, MV Act section)
4. Show e-challan view with fine amount + legal section
5. Navigate violations table → filter by type → see violation records

**Close (30 seconds):**
"Runs on a ₹25K GPU. Each junction <₹50K to retrofit. Rule 167A compliant. Ready for deployment."

**Backup Plan:** If live detection fails, switch to demo mode (pre-seeded data). Dashboard still works, just skip the upload step.

---

## 9. Key Differentiators (from Round 1 Improvements)

### Accepted — Will Build

| # | Feature | Effort | Why It Wins |
|---|---------|--------|-------------|
| 1 | **Bengaluru-calibrated demo data** | LOW (<1hr) | Judges see "Silk Board" and nod — that's their city |
| 2 | **ROI Calculator** | LOW (<1hr) | Speaks admin language: ₹7.2 Cr/yr potential recovery |
| 3 | **Command Center aesthetic** | LOW (<1hr) | Ticking clock, BTP badge, status bar — feels real |
| 4 | **Evidence viewer as legal doc** | MEDIUM (2hr) | FIR-style layout, SHA-256 hash, Print Evidence button |
| 5 | **Dark map tiles + Bengaluru polygon** | LOW (<1hr) | Command center look, jurisdiction scope |
| 6 | **E-Challan styled view** | MEDIUM (2hr) | Shows complete workflow: detect → evidence → fine |
| 7 | **Audit trail in DB** | MEDIUM (1hr) | Court-ready chain of custody |

### Rejected — Too Costly for 2 Days

| # | Feature | Why Rejected |
|---|---------|--------------|
| 1 | Review queue (approve/reject) | 3+ hours, complex UX |
| 2 | Alert toast with sound | Nice but not critical |
| 3 | Mobile responsive + kiosk mode | Not demo-critical |
| 4 | Full chain-of-custody export ZIP | Overkill for demo |
| 5 | Video processing with SSE | Too risky, replaced with simple upload |

---

## 10. Risk Register (Updated from v0)

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| ~~PaddleOCR install fails~~ | — | — | **Eliminated**: Switched to RapidOCR (ONNX) |
| VRAM OOM with multiple models | Medium | High | Sequential loading, OCR on CPU, profile early |
| Triple riding false positives | Medium | High | Horizontal-center clustering + curated demo images |
| Frontend takes too long | Medium | High | Cut to 4 pages, seed demo data, build backwards |
| Demo fails live | Medium | Critical | Demo mode toggle + pre-recorded video backup |
| RapidOCR accuracy low on Indian plates | Low | Medium | Indian plate regex post-processing, CLAHE on plate crops |
| Helmet model domain gap | Medium | Medium | Curate demo images, show confidence scores, acknowledge in narrative |

---

## 11. Confidence-Gated Detection

Every violation gets a confidence score and is displayed with:
- 🟢 **High confidence (>80%)**: Green badge — "Auto-detectable"
- 🟡 **Medium confidence (50-80%)**: Yellow badge — "Review recommended"
- 🔴 **Low confidence (<50%)**: Red badge — "Manual verification needed"

This isn't a full review queue (too complex), but it shows judges we understand that AI isn't infallible.

---

## 12. Bengaluru Demo Data Specification

### 8-10 Real Junctions with GPS Coordinates

| Junction | Lat, Lon | Primary Violations | Peak Hours |
|----------|----------|-------------------|------------|
| Silk Board Junction | 12.9170, 77.6229 | Helmet (40%), Triple (30%) | 8-10 AM |
| Koramangala 5th Block | 12.9352, 77.6245 | Triple riding (50%), Parking (30%) | Weekend nights |
| Majestic Bus Stand | 12.9767, 77.5753 | Parking (60%), Helmet (20%) | All day |
| Whitefield Main Rd | 12.9698, 77.7500 | Helmet (50%), Triple (30%) | 7-10 AM |
| MG Road | 12.9758, 77.6065 | Mixed violations | 5-8 PM |
| Hebbal Flyover | 13.0358, 77.5970 | Helmet (40%), Parking (40%) | 8-10 AM |
| Banashankari | 12.9170, 77.5538 | Parking (70%) | 10 AM - 4 PM |
| Electronic City Phase 1 | 12.8458, 77.6605 | Helmet (60%), Triple (20%) | Shift changes |

### Synthetic Plate Numbers
- KA-01-AB-1234 through KA-51-XX-9999 (Karnataka registration format)
- Some null plates (detection failure) for realism

### Time Distribution
- Last 30 days of data
- Hourly patterns matching real BTP published statistics
- ~200-300 total records

---

## 13. Demo Image Curation Strategy

**Problem:** Pre-trained models trained on Western data will fail on random Indian traffic images.

**Solution:** Curate 15-20 images that we KNOW work:

1. Search for Indian traffic camera screenshots from news sites
2. BTP social media posts (public images)
3. YouTube thumbnails from Indian dashcam videos
4. Test each image through the pipeline manually
5. Keep only images where: helmet detection works, plate OCR reads correctly
6. Use these as the demo set

**For the demo:** Upload from curated set, not random images.

---

## 14. Absolute Minimum Viable Demo

If everything goes wrong and we only have 1 day:

1. ✅ Dashboard with seeded Bengaluru data (stats, ROI, map)
2. ✅ Upload image → YOLO detects vehicles/persons → shows bounding boxes
3. ✅ Rule engine flags helmet violation
4. ✅ Violation record saved to SQLite
5. ✅ Dashboard shows violation count + recent violations

**Everything else is stretch.**

---

## 15. Key Metrics

| Metric | Target | How |
|--------|--------|-----|
| mAP@50 (helmet detection) | >0.74 | Pre-trained model baseline |
| OCR character accuracy | >90% | On curated demo images |
| Inference FPS (single image) | >25 FPS | RTX 3050, YOLOv8n |
| End-to-end latency (upload → result) | <5s | API benchmark |
| Dashboard load time | <2s | Vite build optimization |
