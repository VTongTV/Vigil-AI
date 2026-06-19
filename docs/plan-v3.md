# VigilAI — Master Plan v3 (After Round 3 Refinement — Aggressive Cuts)

> **Track:** 3 — Automated Photo Identification and Classification for Traffic Violations Using CV
> **Hackathon:** Flipkart GridLock 2.0, Round 2 (Prototype Phase)
> **Deadline:** June 21, 2026, 11:59 PM IST
> **Team:** Vedant Tong (solo)
> **Hardware:** RTX 3050 Laptop (4GB VRAM), 16GB RAM, Windows 11

---

## 1. Product Vision

**VigilAI** is an AI-powered traffic violation detection system for **Bengaluru Traffic Police**. It processes traffic camera images to detect violations, read license plates, generate court-admissible evidence, and display results on a command center dashboard.

**Differentiator:** Most Track 3 submissions are concept notes. We deliver a **working prototype**.

**Winning Narrative:** "87% of BTP violations are now contactless, but only 75 junctions have AI cameras. VigilAI retrofits onto ANY existing CCTV — scaling from 75 to 500+ junctions. AI assists, doesn't replace officers."

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────┐
│         VigilAI Command Center (React)                  │
│  Dashboard │ Upload │ Violations │ Evidence │ Map     │
└──────────────────┬───────────────────────────────────┘
                   │ REST API
┌──────────────────▼───────────────────────────────────┐
│               FastAPI Backend                          │
│  Preprocess → Detect (COCO+Helmet) → Associate → OCR  │
│  (OpenCV)      (YOLOv8n, GPU)         (Rules)  (CPU)  │
│  → Plate Detect (on-demand) → Evidence → DB            │
│  Pipeline Waterfall: timing per stage                  │
│  StaticFiles: /static/evidence/                        │
└──────────────────────────────────────────────────────┘
```

---

## 3. Violation Detection Scope (CUT FROM v2)

### P0 — Core Demo (80% of demo time)

| Violation | Approach |
|-----------|----------|
| **Helmet non-compliance** | YOLOv8n COCO (person+motorcycle) + pre-trained helmet model + **head-region spatial association** (top 30% of person bbox → find overlapping helmet/no-helmet detection) |
| **Triple riding** | Person bbox association to motorcycle using **2D spatial constraints**: horizontal center within bike ± buffer AND vertical overlap > 30% (eliminates pedestrians behind bikes) |

### P1 — Demo Polish

| Violation | Approach |
|-----------|----------|
| **License plate OCR** | Two-stage: YOLOv8n plate detection (on-demand) → RapidOCR on CPU + Indian plate regex |

### CUT FROM v2

| Feature | Reason |
|---------|--------|
| Illegal parking | Too risky (polygon zones + dwell time untested), not a headline feature |
| One Junction Live Feed | Fake real-time, high effort, judges see through it; populated dashboard is enough |
| Confidence Threshold Playground | Looks indecisive in demo; fixed thresholds + confidence badges are more confident |
| E-Challan separate page | Inline fine info on evidence viewer instead |
| Full audit trail export ZIP | Backend-only, no visual payoff for demo |

---

## 4. Tech Stack (Refined)

| Layer | Technology | Change from v2 |
|-------|-----------|---------------|
| Detection | YOLOv8n (ultralytics) | No change |
| Helmet | Pre-trained from Roboflow/HuggingFace | No change |
| Plate Detection | YOLOv8n from Roboflow | No change |
| OCR | RapidOCR v1.4.4 (ONNX Runtime, CPU) | No change |
| Tracking | ByteTrack | No change |
| Preprocessing | OpenCV (CLAHE, denoise, gamma) | No change |
| Backend | FastAPI + uvicorn + StaticFiles | Added StaticFiles for evidence images |
| Database | SQLite + SQLAlchemy (sync) | No change |
| Frontend | React 19 + Vite + TailwindCSS + shadcn/ui | No change |
| Charts | Recharts | No change |
| Map | react-leaflet + **MapmyIndia tiles** | **CHANGED: Use MapmyIndia** (hackathon sponsor) |
| State | Zustand | No change |

---

## 5. VRAM Strategy (Same as v2)

- COCO model + Helmet model: always loaded (~1.5 GB with context)
- Plate model: on-demand load → infer → unload → gc.collect() → empty_cache()
- RapidOCR: CPU only
- Pre-warm all models at startup with dummy inference
- **NEW**: Set `OMP_NUM_THREADS=4` and `ONNX_NUM_THREADS=4` before importing RapidOCR
- **NEW**: Verify ONNX Runtime has no CUDA provider: `assert "CUDAExecutionProvider" not in ort.get_available_providers()`

---

## 6. Critical Implementation Details (NEW in v3)

### 6.1 Helmet ↔ Person Association (THE #1 Missing Piece)

Helmet models detect on **head regions** (small bboxes). COCO detects **full-body persons** (large bboxes). These must be associated spatially:

```python
def associate_helmets_to_persons(person_boxes, helmet_boxes, helmet_labels):
    """For each person, extract head region (top 30%), find overlapping helmet detection."""
    for person in person_boxes:
        # Head region: top 30% of person bbox, 10% wider each side
        head_region = expand_bbox(top_fraction(person, 0.30), horizontal=0.10)
        # Find best-overlapping helmet detection
        best_match = find_best_iou_match(head_region, helmet_boxes, threshold=0.3)
        # If match found and label is "no_helmet" → VIOLATION
        # If no match found → assume no helmet (conservative for demo)
```

**Parameters to validate on test images**: `0.30` head fraction, `0.10` horizontal expansion, `0.3` IoU threshold.

### 6.2 Triple Riding with 2D Spatial Constraints

```python
def detect_triple_riding(motorcycle_boxes, person_boxes):
    """Count persons ON each motorcycle using 2D spatial checks."""
    for moto in motorcycle_boxes:
        riders = []
        for person in person_boxes:
            # CHECK 1: horizontal center within motorcycle ± 15% buffer
            if not within_horizontal_span(person, moto, buffer=0.15):
                continue
            # CHECK 2: vertical overlap > 30% (eliminates pedestrians behind bike)
            if vertical_overlap_ratio(person, moto) < 0.3:
                continue
            # CHECK 3: person bbox not wider than motorcycle (eliminates other vehicles)
            if person_width(person) > motorcycle_width(moto) * 1.2:
                continue
            riders.append(person)
        if len(riders) >= 3:
            flag_triple_riding(moto, riders)
```

### 6.3 Bbox Coordinate Normalization

All YOLOv8 models output xyxy in pixel coordinates of the **original image** when called via `model.predict(image_bgr)`. But Roboflow exports may differ. Defensive approach:
- Validate all coordinates are within image bounds (assert)
- Log any coordinate anomalies during pre-build testing
- Use `ultralytics` native `model.predict()` path (not custom inference) to get consistent coordinate handling

### 6.4 POST /api/v1/detect — Full Contract

```
Request: multipart/form-data
  - image: File (required, JPEG/PNG, max 10MB)
  - camera_id: string (optional, default "CAM-UPLOAD-001")

Response 200:
{
  "success": true,
  "processing_time_ms": 1847,
  "timing_breakdown": {
    "preprocess_ms": 120,
    "detect_coco_ms": 340,
    "detect_helmet_ms": 310,
    "violation_logic_ms": 45,
    "detect_plate_ms": 280,
    "ocr_ms": 150,
    "evidence_gen_ms": 280
  },
  "violations": [ViolationRecord, ...],  // can be empty
  "image_dimensions": { "width": 1920, "height": 1080 }
}

Error Responses:
  400: { "success": false, "error": "Invalid image format" }
  413: { "success": false, "error": "Image too large (max 10MB)" }
  500: { "success": false, "error": "Detection pipeline failed" }
  503: { "success": false, "error": "Models not loaded" }
```

**Always return 200 with `violations: []` when detection succeeds but finds nothing.**

### 6.5 Bbox Overlay Rendering

- API returns **normalized coordinates** (0.0-1.0) relative to original image dimensions
- Frontend renders on `<canvas>` overlaid on `<img>` via `position: relative/absolute`
- Canvas scales to displayed image size; coords multiplied by canvas dimensions
- During processing: shadcn Skeleton component as loading placeholder

### 6.6 Evidence Image Serving

- Backend saves to `outputs/evidence/{violation_id}_annotated.jpg` and `..._original.jpg`
- FastAPI mounts: `app.mount("/static/evidence", StaticFiles(directory="outputs/evidence"))`
- `ViolationRecord.image_url` = `/static/evidence/{id}_annotated.jpg`
- Frontend renders as standard `<img src={violation.image_url} />`

### 6.7 Demo Mode

- Zustand flag: `isDemoMode: boolean` persisted in `localStorage`
- When ON: Upload page uses hardcoded demo responses (5 curated image → JSON mappings)
- Small yellow "DEMO" badge in nav bar when active
- Toggle in nav bar next to IST clock
- **Works even if backend is completely dead**

---

## 7. Phase-Wise Build Plan (REVISED — Aggressive Cuts)

### PRE-BUILD (1.5-2 hours — CRITICAL)
- [ ] Create venv, install all deps (`rapidocr-onnxruntime==1.4.4`)
- [ ] Download all model weights
- [ ] **SMOKE TEST**: Run YOLOv8n + helmet model on 3-5 **overhead** Indian traffic images
- [ ] **SMOKE TEST**: Run RapidOCR on a cropped Indian plate image
- [ ] **SMOKE TEST**: Load 2 YOLO models + check nvidia-smi VRAM
- [ ] **SMOKE TEST**: Load/unload plate model 5 times, check VRAM fragmentation
- [ ] Define data schema contract (Pydantic + TypeScript types)
- [ ] Scaffold project directory structure
- **GO/NO-GO**: If COCO + helmet model can't detect persons/motorcycles on overhead Indian images → **pivot to "evidence generator" demo** (upload → annotation → legal doc, skip violation detection)

### Phase 1: CV Pipeline (Day 1, Hours 0-8) — REDUCED FROM v2
- [ ] `configs/default.yaml` + `config.py` + `schemas.py`
- [ ] `preprocessing.py` (CLAHE, denoise, gamma)
- [ ] `detector.py` (COCO + Helmet resident, plate on-demand, bbox normalization)
- [ ] `violations.py` (helmet with head-region association + triple riding with 2D constraints)
- [ ] `evidence.py` (annotated image + SHA-256 hash + save to disk)
- [ ] Pipeline Waterfall timing hooks (`time.perf_counter()` per stage)
- [ ] **GATE Hour 4**: Helmet association works on 2 test images? If not, debug until it does.
- [ ] **GATE Hour 6**: Triple riding detection works? If not, drop to P1 or skip.
- [ ] **GATE Hour 8**: Full pipeline on 5 images → GO to Phase 2, NO-GO → demo mode

### Phase 2: Backend + Seed Data (Day 1, Hours 8-14)
- [ ] FastAPI app with lifespan (COCO + helmet resident, pre-warm)
- [ ] StaticFiles mount for evidence images
- [ ] Routes: detect, violations (CRUD + approve/reject), evidence, analytics
- [ ] SQLite schema matching data contract
- [ ] `ocr.py` (RapidOCR on CPU + Indian plate regex + ONNX thread limits)
- [ ] Audit events in DB
- [ ] `scripts/seed_bengaluru_demo.py` — 200-300 violations at 8-10 real Bengaluru junctions
- [ ] **GATE**: All endpoints return correct seeded data

### Phase 3: Frontend Core (Day 2, Hours 0-8)
- [ ] Scaffold React + Vite + Tailwind + shadcn/ui
- [ ] **Command Center Layout** (dark navy, ticking IST clock, BTP badge, operational status)
- [ ] Dashboard page (stats cards + ROI calculator + Pipeline Waterfall + recent violations)
- [ ] Upload page (FormData upload → canvas bbox overlay → violation cards with confidence badges)
- [ ] Evidence viewer (split panel: annotated canvas + FIR-style metadata + inline fine info)
- [ ] Violation cards with Approve/Reject + confidence tier badges (🟢🟡🔴)
- [ ] Demo mode toggle (Zustand + localStorage + hardcoded fallback responses)
- [ ] **GATE**: Upload image → see violations → approve/reject → view evidence

### Phase 4: Polish + Submission (Day 2, Hours 8-14) — RIGHT-SIZED
- [ ] Violations table page (filter by type, confidence, date, status)
- [ ] Analytics page (Recharts: by type, time trends, junction breakdown)
- [ ] Map page (MapmyIndia tiles, Bengaluru polygon, violation markers with popups)
- [ ] ROI Calculator with defensible methodology (show math, not just number)
- [ ] Curate 15-20 demo images confirmed working
- [ ] **Submission deliverables**:
  - 10-slide presentation
  - 2-minute video walkthrough
  - README.md with one-command setup
  - Push to GitHub
  - Screenshots
- [ ] Final end-to-end test

### Phase 5: Final Prep (Day 2, Hours 14-16)
- [ ] Test 3 "guaranteed working" demo images
- [ ] Record backup demo video
- [ ] Submit to HackerEarth

---

## 8. Key Differentiators (v3 — After 3 Rounds)

### Built Into Product (12 differentiators, prioritized)

| # | Feature | Effort | Priority | Why It Wins |
|---|---------|--------|----------|-------------|
| 1 | Working prototype (not concept note) | — | P0 | Only team that actually built something |
| 2 | Helmet detection with head-region association | LOW | P0 | Correct spatial logic, not naive IoU |
| 3 | Bengaluru-calibrated demo data | LOW | P0 | Judges see their city, their junctions |
| 4 | Command Center aesthetic | LOW | P0 | Feels like a real police tool |
| 5 | Approve/Reject on violation cards | MEDIUM | P0 | "AI assists, doesn't replace" |
| 6 | Evidence viewer as legal document | MEDIUM | P1 | FIR-style, SHA-256, Print Evidence |
| 7 | Pipeline Waterfall (latency breakdown) | LOW | P1 | Proves real engineering |
| 8 | ROI Calculator with methodology | LOW | P1 | Shows the math behind ₹X Cr |
| 9 | MapmyIndia map tiles (sponsor integration) | LOW | P1 | Turns MapmyIndia judge from skeptic to advocate |
| 10 | Confidence tier badges (🟢🟡🔴) | LOW | P1 | Shows AI self-awareness without indecision |
| 11 | Inline fine info on evidence (MV Act sections) | LOW | P2 | Closes the workflow loop |
| 12 | Audit trail events in DB | MEDIUM | P2 | Court-ready, backend-only |

### Narrative-Only Differentiators (Slides/Presentation)

| # | Feature | Effort | Why |
|---|---------|--------|-----|
| 1 | BTP integration references (ASTraM, Vahan) | FREE | Shows we read the brief |
| 2 | Edge deployment diagram | FREE | 1 laptop → 500 cameras |
| 3 | "AI assists, doesn't replace" framing | FREE | Addresses BTP's #1 fear |
| 4 | Cost comparison (₹50K vs ₹15L) | FREE | Speaks procurement language |
| 5 | Fine-tuning roadmap with BTP data | FREE | "95%+ accuracy within a week of deployment" |

---

## 9. Demo Strategy (Refined — More Focused)

**Opening (30 seconds):**
"87% of BTP violations are contactless, but only 75 junctions have AI cameras. VigilAI retrofits onto ANY existing CCTV. AI assists, doesn't replace officers."

**Live Demo (3 minutes):**
1. Dashboard with Bengaluru data (stats, ROI calculator, pipeline waterfall)
2. Upload curated image → 2-3s processing → violation detected + pipeline waterfall
3. Show evidence viewer: FIR-style metadata, SHA-256, confidence badge, Approve/Reject
4. Show violations table → filter by type → approve a violation
5. Show map with violation markers

**Close (30 seconds):**
"Runs on ₹25K GPU per junction. Officer-verified. Rule 167A compliant. Ready to integrate with ASTraM and Vahan."

**Backup:** Demo mode toggle + 2-minute pre-recorded video.

---

## 10. Data Schema Contract

(Same as v2 Section 6 — no changes needed)

---

## 11. Go/No-Go Decision Points (Refined)

| Time | Decision | If No-Go |
|------|----------|----------|
| PRE-BUILD | Overhead Indian images detectable? | Pivot to "evidence generator" demo |
| PRE-BUILD | RapidOCR works on Windows? | Switch to EasyOCR |
| PRE-BUILD | 2 YOLO models fit in VRAM? | Sequential loading |
| Phase 1 Hour 4 | Helmet association works? | Debug or drop to "bounding box only" demo |
| Phase 1 Hour 6 | Triple riding works? | Drop triple riding, demo helmet only |
| Phase 1 Hour 8 | Full pipeline works on 5 images? | Commit to demo mode (seeded data only) |
| Phase 2 Hour 14 | API returns seeded data? | Hardcode mock data in frontend |
| Phase 3 Hour 8 | Upload → detect → display works? | Skip upload, show dashboard only |

---

## 12. Submission Deliverables

| Item | Format | When |
|------|--------|------|
| Project title + description + Built with | Text fields | Phase 4 |
| Screenshots (3-5) | JPG/PNG ≤3MB | Phase 4 |
| Video link | YouTube 2-min walkthrough | Phase 4 |
| Presentation | PDF, 10 slides | Phase 4 |
| Source code | ZIP ≤50MB | Phase 4 |
| README + setup instructions | Markdown | Phase 4 |

---

## 13. 12-Hour Cut Plan (If Behind Schedule)

| Keep | Cut |
|------|-----|
| Dashboard with seeded data | Map page |
| Upload → detect helmet violation | Analytics charts |
| Command center layout | Audit trail |
| Evidence viewer (basic) | ROI Calculator |
| Pipeline Waterfall | Violations table (use dashboard list) |
| Approve/Reject buttons | MapmyIndia tiles (use CartoDB fallback) |

**Minimum viable demo**: Upload image → YOLO detects persons/vehicles → helmet violation flagged → saved to DB → dashboard shows stats with Bengaluru data. Better than 90% of submissions.

---

## 14. ROI Calculator Methodology (NEW — Defensible Numbers)

**Calculation:**
```
Current BTP AI cameras:           75 junctions
Current daily violations:         ~11,828/day (BTP published, 2025)
Average fine per violation:        ₹500
Current compliance rate:           30% (fine payment)
Current annual recovery:           75 × 158 × ₹500 × 365 × 0.30 ≈ ₹3.4 Cr

With VigilAI (500 junctions):
Projected daily violations:        11,828 × (500/75) ≈ 78,853/day
Projected annual recovery:         500 × 1051 × ₹500 × 365 × 0.30 ≈ ₹28.8 Cr

Investment: 500 junctions × ₹50K  = ₹2.5 Cr
Payback period:                    ~1 month
```

**Note**: The ₹182 Cr number from v2 was inflated. Use the defensible ₹28.8 Cr number with the methodology shown above. Judges respect honest math more than inflated claims.

---

## 15. Risk Register (v3 — Final)

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| Domain gap on overhead Indian images | **HIGH** | Critical | Pre-build smoke test; curated demo images; honest presentation |
| RapidOCR install issues | Low | Medium | Pin v1.4.4, EasyOCR fallback |
| VRAM fragmentation | Medium | Medium | gc.collect() + empty_cache() + pre-load check |
| Helmet-person association fails | Medium | High | Head-region extraction + empirical validation |
| Triple riding false positives | Medium | Medium | 2D constraints + curated images |
| Frontend takes too long | Medium | High | Cut to Dashboard + Upload + Evidence |
| Demo fails live | Medium | Critical | Demo mode toggle + backup video |
| Phase 1 overruns | Medium | High | Hard go/no-go gates + 12-hour cut plan |
| Submission incomplete | Low | Critical | Plan deliverables explicitly |
