# VigilAI — Master Plan (FINAL)

> **Flipkart GridLock 2.0 — Round 2 — Track 3**
> AI-Powered Traffic Violation Detection for Bengaluru Traffic Police
> Last refined through 5 rounds of oracle agent review

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [System Architecture](#2-system-architecture)
3. [Violation Scope](#3-violation-scope)
4. [Tech Stack](#4-tech-stack)
5. [VRAM Strategy](#5-vram-strategy)
6. [Implementation Details](#6-implementation-details)
7. [Data Schema Contract](#7-data-schema-contract)
8. [Phase-Wise Build Plan](#8-phase-wise-build-plan)
9. [Go/No-Go Decision Points](#9-gono-go-decision-points)
10. [Key Differentiators](#10-key-differentiators)
11. [Demo Strategy](#11-demo-strategy)
12. [ROI Calculator Methodology](#12-roi-calculator-methodology)
13. [Submission Deliverables Checklist](#13-submission-deliverables-checklist)
14. [12-Hour Cut Plan](#14-12-hour-cut-plan)
15. [Risk Register](#15-risk-register)
16. [Bengaluru Demo Data Spec](#16-bengaluru-demo-data-spec)
17. [Key Metrics](#17-key-metrics)

---

## 1. Product Vision

### What

**VigilAI** — An AI-powered traffic violation detection system that processes CCTV imagery to automatically detect helmet non-compliance, triple riding, and extract license plates for the Bengaluru Traffic Police (BTP).

### Why

Bengaluru has 75 AI-enabled junctions covering ~87% contactless enforcement. The remaining 500+ junctions rely on manual surveillance. VigilAI retrofits onto **any** existing CCTV — no hardware upgrade needed.

### Who

- **Solo developer**, 2-day hackathon build
- **Hardware**: RTX 3050 4GB VRAM, Windows 11, 16GB RAM
- **Track**: Flipkart GridLock 2.0, Round 2, Track 3

### Winning Narrative

> "AI assists, doesn't replace officers."

VigilAI detects violations. Officers verify and approve. The system provides an audit trail, evidence packages for challans, and integrates with BTP's existing ASTraM/Vahan infrastructure. It's not surveillance — it's **augmented enforcement**.

### Differentiator

Other teams will submit concept notes and mockups. VigilAI will be a **working prototype** that processes real images, detects real violations, and generates real evidence — all on consumer hardware.

---

## 2. System Architecture

### Current Build (Hackathon)

```
┌─────────────────────────────────────────────────────────┐
│                      React 19 Frontend                  │
│              Vite + TailwindCSS + shadcn/ui              │
│         react-leaflet + MapmyIndia / CartoDB Dark        │
│                    Zustand state                         │
├─────────────────────────────────────────────────────────┤
│                      FastAPI Backend                     │
│              uvicorn + SQLAlchemy + SQLite               │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │ YOLOv8n  │  │ YOLOv8n  │  │ RapidOCR  │             │
│  │ COCO+    │  │ Plate    │  │  (CPU)    │             │
│  │ Helmet   │  │ (demand) │  │           │             │
│  └──────────┘  └──────────┘  └───────────┘             │
│                                                          │
│              StaticFiles / evidence/                     │
└─────────────────────────────────────────────────────────┘
```

### Processing Flow

```
Image Upload
    │
    ▼
┌──────────────┐
│ Preprocessing │  CLAHE + Denoise + Gamma
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ COCO+Helmet  │  Resident in VRAM
│ Detection    │  → persons, helmets, no-helmets
│              │  → vehicle categories: car, motorcycle, bus, truck, bicycle
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Violation    │  Head-region association (helmet)
│ Logic        │  2D spatial constraints (triple riding)
│              │  Lane-position heuristic (wrong-side driving)
│              │  Zone-based detection (illegal parking)
│              │  Windshield crop + seatbelt classifier (seatbelt)
│              │  Stop-line zone heuristic (stop-line violation)
│              │  Stop-line zone + signal input (red-light)
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Plate Model  │────▶│ RapidOCR     │  On-demand
│ (on-demand)  │     │ (CPU)        │  Only if violation
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────┐
│ Evidence     │  Annotated image + metadata + hash
│ Generation   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ API Response │  Violations + evidence URLs
└──────────────┘
```

### Production Architecture Narrative

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Edge Node  │────▶│ Cloud Aggregator │────▶│  BTP ASTraM │
│  (Jetson/   │     │  (FastAPI + GPU) │     │  / Vahan    │
│   RTX 3050) │     │                  │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
  Per junction        Central processing      E-challan + DB
  1 FPS capture       Model serving           Govt integration
```

**Key point**: The hackathon build is a vertical slice of this production architecture. Same models, same violation logic, same evidence format — just on a single machine.

---

## 3. Violation Scope

### All 7 PS Violation Types — Full Coverage

| Priority | Violation | Status | Approach | Problem Statement Task |
|----------|-----------|--------|----------|----------------------|
| **P0** | Helmet non-compliance | **IN** | Head-region spatial association | Task 3 ✅ |
| **P1** | Triple riding | **IN** | 2D spatial constraints | Task 3 ✅ |
| **P1** | Wrong-side driving | **IN** | Lane-position heuristic (configurable lane polygons) | Task 3 ✅ |
| **P1** | Illegal parking | **IN** | Vehicle detected in no-parking zone (configurable polygon) | Task 3 ✅ |
| **P1** | Seatbelt non-compliance | **IN** | Best-effort detection via seatbelt model + windshield crop analysis | Task 3 ✅ |
| **P2** | Stop-line violation | **IN** | Zone-based heuristic: vehicle past stop-line polygon | Task 3 ✅ |
| **P2** | Red-light violation | **IN** | Stop-line zone + operator signal input toggle | Task 3 ✅ |
| **P1** | License plate OCR | **IN** | RapidOCR on CPU + Indian plate regex | Task 5 ✅ |

### Approach Tiers

| Tier | Meaning | Violations | Notes |
|------|---------|-----------|-------|
| **Primary** | Production-grade accuracy on single images | Helmet, Triple riding, License plate OCR | Proven models, well-tested algorithms |
| **Heuristic** | Zone/polygon-based detection, configurable per camera | Wrong-side, Illegal parking, Stop-line | Works well with calibrated cameras; accuracy depends on polygon configuration |
| **Best-effort** | Detection possible under favorable conditions, lower confidence expected | Seatbelt, Red-light | Seatbelt: limited by camera angle; Red-light: requires signal state input. Both produce actionable detections that improve with better inputs |

### Seatbelt Detection Strategy

Seatbelt detection from overhead CCTV is inherently challenging — the windshield creates glare, and the camera angle often obscures the shoulder/torso area. Our approach:

1. **Detect car interior via windshield crop** — Use COCO car bbox → crop the upper portion (windshield region)
2. **Run seatbelt classifier on crop** — Small YOLOv8n model trained on seatbelt dataset (Roboflow has several)
3. **Confidence discount** — Apply 0.7× multiplier because overhead angle reduces reliability
4. **Auto-flag as "review recommended"** — UI shows seatbelt violations with a review badge
5. **Improvement path** — Side-angle cameras yield dramatically better results; overhead accuracy improves with better image resolution

### Stop-Line & Red-Light Detection Strategy

Both are temporal violations in principle (require video), but we deliver single-image best-effort:

1. **Stop-line violation** — Define a stop-line polygon in config. If a vehicle's front (lower portion of bbox) is past the stop-line zone, flag violation. Works from single image.
2. **Red-light violation** — Same stop-line zone + **operator signal toggle** (dashboard has a "Signal: RED" button). When operator marks signal as red, any vehicle past the stop-line zone is flagged. Without signal input, the system logs "potential stop-line violation" at reduced confidence.
3. **Improvement path** — Video feed + signal API integration enables fully automated detection in production.

### Cut Items (Not Violation Types)

| Feature | Reason for Cut |
|---------|---------------|
| Confidence playground | Educational feature, not core enforcement value |
| One-junction live feed | RTSP/RTMP streaming adds infrastructure complexity with no detection gain |
| E-challan separate page | Requires BTP API integration that doesn't exist in hackathon scope |

### Compliance with Problem Statement Tasks

| PS Task | Our Coverage | Status |
|---------|-------------|--------|
| 1. Image Preprocessing | CLAHE + Denoise + Gamma (handles low light, noise, blur) | ✅ FULL |
| 2. Vehicle & Road User Detection | COCO detects person, motorcycle, car, bus, truck, bicycle + vehicle categories exposed in API | ✅ FULL |
| 3. Traffic Violation Detection | Helmet ✅, Triple riding ✅, Wrong-side ✅, Illegal parking ✅, Seatbelt ✅ (best-effort), Red-light ✅ (signal input), Stop-line ✅ (zone heuristic) | ✅ FULL (7/7) |
| 4. Violation Classification | Predefined classes + confidence scores + MV Act sections | ✅ FULL |
| 5. License Plate Recognition | YOLOv8n plate detection → RapidOCR OCR → Indian plate regex | ✅ FULL |
| 6. Evidence Generation | Annotated images + metadata + timestamps + SHA-256 hash | ✅ FULL |
| 7. Analytics & Reporting | Stats cards, trends charts, searchable/filterable table, ROI calculator | ✅ FULL |
| 8. Performance Evaluation | mAP, Precision, Recall, F1, OCR accuracy, FPS, latency (computed on test set) | ✅ FULL |

**We cover all 7 listed violation types.** Seatbelt and red-light/stop-line are best-effort with documented improvement paths — a working prototype that detects all 7 types is far stronger than one that cuts 3.

### Why No ByteTrack

ByteTrack was considered in early rounds for multi-object tracking across video frames. **Removed after R4 review** because:

1. We process **single images**, not video streams
2. Tracking adds complexity (frame buffering, ID management) with no benefit for image-based detection
3. Helmet-person association works via spatial overlap in a single frame
4. VRAM savings from not loading a tracker model

---

## 4. Tech Stack

### Computer Vision

| Component | Choice | Version | Purpose | Justification |
|-----------|--------|---------|---------|---------------|
| Object Detection | YOLOv8n (ultralytics) | 8.3.x | Person, vehicle, helmet detection | Smallest YOLOv8 variant, ~6MB weights, <1.5GB VRAM |
| Helmet Model | Pre-trained from Roboflow/HuggingFace | — | Helmet/no-helmet detection | Trained on Indian traffic data, avoids custom training |
| Plate Model | Pre-trained from Roboflow | — | License plate detection | mAP 97.2% on Indian plates |
| OCR | RapidOCR | 1.4.4 | License plate text extraction | CPU-only, ONNX-based, 3-5× faster than PaddleOCR |
| Preprocessing | OpenCV | 4.10.x | CLAHE, denoise, gamma correction | Standard CV preprocessing pipeline |

### Backend

| Component | Choice | Version | Purpose | Justification |
|-----------|--------|---------|---------|---------------|
| Framework | FastAPI | 0.115.x | REST API + WebSocket-ready | Async, auto-docs, Python-native |
| Server | uvicorn | 0.32.x | ASGI server | Standard for FastAPI |
| ORM | SQLAlchemy | 2.0.x | SQLite access | Sync mode (simpler for hackathon) |
| Database | SQLite | 3.x | Local persistence | Zero-config, file-based, sufficient for demo |
| Static Files | FastAPI StaticFiles | — | Evidence image serving | No separate CDN needed |

### Frontend

| Component | Choice | Version | Purpose | Justification |
|-----------|--------|---------|---------|---------------|
| Framework | React | 19.x | UI | Latest stable, concurrent features |
| Build | Vite | 6.x | Dev server + bundler | Fast HMR, tree-shaking |
| Styling | TailwindCSS | 4.x | Utility-first CSS | Rapid prototyping, dark theme native |
| Components | shadcn/ui | latest | Accessible component library | Copy-paste, no lock-in, beautiful defaults |
| Charts | Recharts | 2.x | Dashboard charts | Simple, React-native, lightweight |
| Map | react-leaflet | 4.x | Map visualization | Leaflet wrapper, MapmyIndia compatible |
| Tiles | MapmyIndia | — | Bengaluru map tiles | Hackathon sponsor integration |
| Tiles (fallback) | CartoDB Dark | — | Dark map tiles | Always works, no API key |
| State | Zustand | 5.x | Client state management | Minimal boilerplate, demo mode flag |

### NOT Used (and Why)

| Rejected | In Favor Of | Reason |
|----------|-------------|--------|
| PaddleOCR | RapidOCR | PaddleOCR requires PaddlePaddle framework (heavy), RapidOCR is ONNX-only (lightweight) |
| ByteTrack | Spatial association | Single image processing, no tracking needed |
| PostgreSQL | SQLite | No network overhead for hackathon demo |
| Next.js | Vite + React | No SSR needed, simpler setup |
| MUI | shadcn/ui | shadcn is copy-paste, no runtime cost, Tailwind-native |

---

## 5. VRAM Strategy

### Budget

| Component | VRAM | Mode | When |
|-----------|------|------|------|
| YOLOv8n COCO+Helmet | ~1.5 GB | **Resident** | Always loaded after startup |
| YOLOv8n Plate | ~0.8 GB | **On-demand** | Load → infer → unload |
| RapidOCR | 0 GB | CPU only | Never touches VRAM |
| PyTorch context | ~0.5 GB | Resident | Base CUDA overhead |
| **Total peak** | ~2.8 GB | | Fits in 4 GB with headroom |

### Load/Unload Protocol

```python
import gc
import torch

def load_plate_model(model_path: str) -> YOLO:
    """Load plate model with VRAM pre-check."""
    vram_free = torch.cuda.mem_get_info()[0] / (1024**3)
    if vram_free < 1.5:
        logger.warning("Insufficient VRAM for plate model: %.2f GB free", vram_free)
        raise RuntimeError(f"Insufficient VRAM: {vram_free:.2f} GB free, need 1.5 GB")
    
    model = YOLO(model_path)
    model.to("cuda")
    logger.info("Plate model loaded. VRAM: %.2f GB used", 
                torch.cuda.memory_allocated() / (1024**3))
    return model

def unload_plate_model(model: YOLO) -> None:
    """Unload plate model and reclaim VRAM."""
    model.to("cpu")
    del model
    gc.collect()
    torch.cuda.empty_cache()
    logger.info("Plate model unloaded. VRAM: %.2f GB used",
                torch.cuda.memory_allocated() / (1024**3))
```

### Threading Constraints

```bash
OMP_NUM_THREADS=4
ONNX_NUM_THREADS=4
```

- RapidOCR runs ONNX Runtime on CPU
- Must not spawn threads that compete with YOLO inference
- Verify NO CUDA provider in ONNX Runtime:

```python
import onnxruntime as ort
providers = ort.get_available_providers()
assert "CUDAExecutionProvider" not in providers, "RapidOCR must use CPU only"
```

### Pre-Warm at Startup

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load COCO+Helmet model
    app.state.coco_helmet_model = YOLO("weights/coco_helmet.pt")
    app.state.coco_helmet_model.to("cuda")
    
    # Pre-warm: run one dummy inference
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    app.state.coco_helmet_model.predict(dummy, verbose=False)
    
    logger.info("COCO+Helmet model pre-warmed. VRAM: %.2f GB",
                torch.cuda.memory_allocated() / (1024**3))
    
    yield
    
    # Cleanup
    torch.cuda.empty_cache()
```

---

## 6. Implementation Details

### 6.1 Helmet-Person Head-Region Association

The core algorithm for detecting helmet non-compliance from overhead CCTV angles.

**Problem**: A YOLO model detects persons and helmets separately. We need to associate each person with a helmet (or lack thereof).

**Solution**: Head-region spatial association — the top 30% of a person bbox contains the head. Any helmet/no-helmet detection overlapping this region is associated with that person.

```python
def associate_helmets_to_persons(
    persons: list[dict],
    helmets: list[dict],
    no_helmets: list[dict],
    iou_threshold: float = 0.15,
    head_region_ratio: float = 0.30,
) -> list[dict]:
    """Associate helmet/no-helmet detections to person head regions.

    Args:
        persons: List of person detections with 'bbox' [x1, y1, x2, y2] (normalized).
        helmets: List of helmet detections with 'bbox' and 'confidence'.
        no_helmets: List of no-helmet detections with 'bbox' and 'confidence'.
        iou_threshold: Minimum IoU between head region and helmet bbox.
        head_region_ratio: Fraction of person bbox height that constitutes the head region.

    Returns:
        List of dicts with keys: person_idx, has_helmet, helmet_conf, head_bbox
    """
    results = []

    for p_idx, person in enumerate(persons):
        px1, py1, px2, py2 = person["bbox"]
        person_h = py2 - py1

        # Head region: top 30% of person bbox
        head_y2 = py1 + person_h * head_region_ratio
        head_bbox = [px1, py1, px2, head_y2]

        best_helmet = None
        best_iou = iou_threshold

        # Check helmets (person IS wearing)
        for h in helmets:
            iou = compute_iou(head_bbox, h["bbox"])
            if iou > best_iou:
                best_iou = iou
                best_helmet = {"has_helmet": True, "confidence": h["confidence"]}

        # Check no-helmets (person is NOT wearing)
        for nh in no_helmets:
            iou = compute_iou(head_bbox, nh["bbox"])
            if iou > best_iou:
                best_iou = iou
                best_helmet = {"has_helmet": False, "confidence": nh["confidence"]}

        results.append({
            "person_idx": p_idx,
            "has_helmet": best_helmet["has_helmet"] if best_helmet else False,
            "helmet_conf": best_helmet["confidence"] if best_helmet else 0.0,
            "head_bbox": head_bbox,
            "person_bbox": person["bbox"],
        })

    return results


def compute_iou(box_a: list[float], box_b: list[float]) -> float:
    """Compute Intersection over Union between two bounding boxes.

    Args:
        box_a: [x1, y1, x2, y2] normalized coordinates.
        box_b: [x1, y1, x2, y2] normalized coordinates.

    Returns:
        IoU value in [0, 1].
    """
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    return intersection / union if union > 0 else 0.0
```

### 6.2 Triple Riding — 2D Spatial Constraints

**Problem**: Detect 3+ persons on a single two-wheeler from a single image.

**Solution**: Two-wheeler bounding box contains 3+ persons whose centers are horizontally aligned and vertically overlapping.

```python
def detect_triple_riding(
    persons: list[dict],
    two_wheelers: list[dict],
    min_persons: int = 3,
    horizontal_center_threshold: float = 0.5,
    vertical_overlap_threshold: float = 0.30,
) -> list[dict]:
    """Detect triple riding violations from person + two-wheeler detections.

    Args:
        persons: Person detections with 'bbox' [x1, y1, x2, y2] (normalized).
        two_wheelers: Two-wheeler detections with 'bbox' and 'confidence'.
        min_persons: Minimum persons on a two-wheeler to flag triple riding.
        horizontal_center_threshold: Max fraction of two-wheeler width for center deviation.
        vertical_overlap_threshold: Minimum vertical overlap between riders.

    Returns:
        List of violations with vehicle bbox, rider count, rider bboxes.
    """
    violations = []

    for tw in two_wheelers:
        tw_x1, tw_y1, tw_x2, tw_y2 = tw["bbox"]
        tw_w = tw_x2 - tw_x1
        tw_cx = (tw_x1 + tw_x2) / 2

        riders = []
        for p in persons:
            px1, py1, px2, py2 = p["bbox"]
            p_cx = (px1 + px2) / 2
            p_cy = (py1 + py2) / 2

            # Constraint 1: Person center is within two-wheeler bbox (with margin)
            if not (tw_x1 - 0.05 <= p_cx <= tw_x2 + 0.05 and
                    tw_y1 - 0.05 <= p_cy <= tw_y2 + 0.05):
                continue

            # Constraint 2: Person horizontal center within threshold of two-wheeler center
            if abs(p_cx - tw_cx) > tw_w * horizontal_center_threshold:
                continue

            riders.append(p)

        # Check vertical overlap between riders
        if len(riders) >= min_persons:
            riders.sort(key=lambda r: r["bbox"][1])  # Sort by y1
            max_overlap = 0.0
            for i in range(len(riders) - 1):
                r1_y2 = riders[i]["bbox"][3]
                r2_y1 = riders[i + 1]["bbox"][1]
                r1_h = riders[i]["bbox"][3] - riders[i]["bbox"][1]
                overlap = max(0, r1_y2 - r2_y1) / r1_h if r1_h > 0 else 0
                max_overlap = max(max_overlap, overlap)

            if max_overlap >= vertical_overlap_threshold:
                violations.append({
                    "type": "triple_riding",
                    "vehicle_bbox": tw["bbox"],
                    "rider_count": len(riders),
                    "rider_bboxes": [r["bbox"] for r in riders],
                    "confidence": tw.get("confidence", 0.5),
                })

    return violations
```

### 6.3 POST /api/v1/detect — Full Contract

**Request**

```http
POST /api/v1/detect HTTP/1.1
Content-Type: multipart/form-data

image: <binary image file>
```

**Success Response (200)**

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
      "metadata": {
        "head_bbox": [0.42, 0.10, 0.58, 0.35],
        "helmet_detected": false
      },
      "mv_act_section": "129",
      "fine_amount": 500,
      "evidence_url": "/evidence/v_20260616_143022_001.jpg",
      "license_plate": null
    },
    {
      "violation_id": "v_20260616_143022_002",
      "type": "triple_riding",
      "confidence": 0.72,
      "confidence_tier": "medium",
      "bbox": [0.20, 0.30, 0.80, 0.90],
      "person_bbox": null,
      "metadata": {
        "rider_count": 3,
        "rider_bboxes": [[0.30, 0.30, 0.50, 0.70], [0.40, 0.35, 0.55, 0.75], [0.50, 0.30, 0.70, 0.70]],
        "vehicle_bbox": [0.20, 0.30, 0.80, 0.90]
      },
      "mv_act_section": "184",
      "fine_amount": 1000,
      "license_plate": {
        "text": "KA01AB1234",
        "confidence": 0.91,
        "bbox": [0.10, 0.85, 0.30, 0.95]
      }
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

**Error Responses**

```json
// 400 — Invalid image
{
  "success": false,
  "error": "INVALID_IMAGE",
  "detail": "Uploaded file is not a valid image. Supported: JPEG, PNG, WebP."
}

// 413 — Image too large
{
  "success": false,
  "error": "IMAGE_TOO_LARGE",
  "detail": "Image exceeds 10MB limit."
}

// 503 — Model not ready
{
  "success": false,
  "error": "MODEL_NOT_READY",
  "detail": "Detection model is loading. Please retry in 5 seconds."
}

// 500 — Inference failed
{
  "success": false,
  "error": "INFERENCE_FAILED",
  "detail": "Detection pipeline encountered an error. See server logs."
}
```

### 6.4 Bbox Overlay Rendering

Bboxes use **normalized coordinates** [0, 1] relative to image dimensions. The frontend canvas renders them by scaling:

```typescript
function drawBbox(
  ctx: CanvasRenderingContext2D,
  bbox: [number, number, number, number],
  imgWidth: number,
  imgHeight: number,
  color: string,
  label: string,
): void {
  const [x1, y1, x2, y2] = bbox;
  const px1 = x1 * imgWidth;
  const py1 = y1 * imgHeight;
  const px2 = x2 * imgWidth;
  const py2 = y2 * imgHeight;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(px1, py1, px2 - px1, py2 - py1);

  ctx.fillStyle = color;
  ctx.font = "bold 12px monospace";
  ctx.fillText(label, px1, py1 - 4);
}
```

Color mapping:

| Violation | Color | Hex |
|-----------|-------|-----|
| no_helmet | Red | `#ef4444` |
| triple_riding | Orange | `#f97316` |
| Person | Blue | `#3b82f6` |
| Helmet | Green | `#22c55e` |
| License plate | Yellow | `#eab308` |

### 6.5 Evidence Image Serving

Evidence images are served via FastAPI's StaticFiles mount:

```python
app.mount("/evidence", StaticFiles(directory="outputs/evidence"), name="evidence")
```

- Directory: `outputs/evidence/`
- Naming: `{violation_id}.jpg`
- Accessed at: `http://localhost:8000/evidence/{violation_id}.jpg`

### 6.6 Demo Mode

Demo mode allows the frontend to function without a running backend.

**Implementation**: Zustand store flag `demoMode: boolean`

```typescript
// stores/appStore.ts
interface AppState {
  demoMode: boolean;
  toggleDemoMode: () => void;
}

const useAppStore = create<AppState>((set) => ({
  demoMode: localStorage.getItem("vigilai_demo") === "true",
  toggleDemoMode: () =>
    set((state) => {
      const next = !state.demoMode;
      localStorage.setItem("vigilai_demo", String(next));
      return { demoMode: next };
    }),
}));
```

When `demoMode === true`:
- API calls return hardcoded responses from `src/mocks/`
- Dashboard shows seeded data
- Upload page uses pre-curated demo images
- A **"DEMO MODE"** badge is visible in the header
- No actual backend requests are made

---

## 7. Data Schema Contract

### ViolationRecord (Python)

```python
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum as SAEnum, JSON
from sqlalchemy.orm import DeclarativeBase

class ViolationType(str, Enum):
    NO_HELMET = "no_helmet"
    TRIPLE_RIDING = "triple_riding"
    WRONG_SIDE_DRIVING = "wrong_side_driving"
    ILLEGAL_PARKING = "illegal_parking"
    NO_SEATBELT = "no_seatbelt"
    STOP_LINE_VIOLATION = "stop_line_violation"
    RED_LIGHT_VIOLATION = "red_light_violation"
    LICENSE_PLATE_MISMATCH = "license_plate_mismatch"

class DataSource(str, Enum):
    SEEDED = "seeded"
    LIVE = "live"

class Base(DeclarativeBase):
    pass

class ViolationRecord(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True)                    # v_20260616_143022_001
    violation_type = Column(SAEnum(ViolationType), nullable=False)
    confidence = Column(Float, nullable=False)                # 0.0 - 1.0
    confidence_tier = Column(String, nullable=False)         # "high" | "medium" | "low"
    bbox = Column(JSON, nullable=False)                       # [x1, y1, x2, y2] normalized
    person_bbox = Column(JSON, nullable=True)                 # [x1, y1, x2, y2] normalized
    metadata = Column(JSON, nullable=False)                   # Violation-specific metadata
    mv_act_section = Column(String, nullable=False)          # "129", "184", "177"
    fine_amount = Column(Integer, nullable=False)            # 500, 1000, 200
    license_plate = Column(JSON, nullable=True)              # {text, confidence, bbox} or null
    evidence_url = Column(String, nullable=False)            # /evidence/{id}.jpg
    evidence_hash = Column(String, nullable=False)           # SHA-256 of evidence image
    image_id = Column(String, nullable=False)                # Source image identifier
    junction_name = Column(String, nullable=False)           # "MG Road - Trinity Circle"
    latitude = Column(Float, nullable=False)                  # 12.9757
    longitude = Column(Float, nullable=False)                 # 77.6063
    timestamp = Column(DateTime, nullable=False)             # Detection/seeded timestamp
    status = Column(String, nullable=False, default="pending") # "pending" | "approved" | "rejected"
    data_source = Column(SAEnum(DataSource), nullable=False) # "seeded" | "live"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### AuditEvent (Python)

```python
class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True)                    # ae_20260616_143022_001
    violation_id = Column(String, nullable=False)            # FK to violations.id
    action = Column(String, nullable=False)                  # "created" | "approved" | "rejected" | "evidence_viewed"
    actor = Column(String, nullable=False, default="system") # "system" | "officer_001"
    detail = Column(JSON, nullable=True)                     # Action-specific metadata
    timestamp = Column(DateTime, default=datetime.utcnow)
```

### TypeScript Mirror

```typescript
// types/violation.ts

type ViolationType = "no_helmet" | "triple_riding" | "wrong_side_driving" | "illegal_parking" | "no_seatbelt" | "stop_line_violation" | "red_light_violation" | "license_plate_mismatch";
type DataSource = "seeded" | "live";
type ConfidenceTier = "high" | "medium" | "low";
type ViolationStatus = "pending" | "approved" | "rejected";

interface Bbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LicensePlateResult {
  text: string;
  confidence: number;
  bbox: Bbox;
}

interface ViolationRecord {
  id: string;
  violation_type: ViolationType;
  confidence: number;
  confidence_tier: ConfidenceTier;
  bbox: Bbox;
  person_bbox: Bbox | null;
  metadata: Record<string, unknown>;
  mv_act_section: string;
  fine_amount: number;
  license_plate: LicensePlateResult | null;
  evidence_url: string;
  evidence_hash: string;
  image_id: string;
  junction_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;  // ISO 8601
  status: ViolationStatus;
  data_source: DataSource;
  created_at: string;
  updated_at: string;
}

interface AuditEvent {
  id: string;
  violation_id: string;
  action: "created" | "approved" | "rejected" | "evidence_viewed";
  actor: string;
  detail: Record<string, unknown> | null;
  timestamp: string;
}
```

**Important**: `violation_type` uses `"no_helmet"` | `"triple_riding"` | `"wrong_side_driving"` | `"illegal_parking"` | `"license_plate_mismatch"`. These cover 4 of 7 violation types listed in the problem statement (seatbelt, red-light, and stop-line are cut because they require temporal/video reasoning).

---

## 8. Phase-Wise Build Plan

### PRE-BUILD (Before Day 1)

| Task | Duration | Success Criteria |
|------|----------|-----------------|
| Create venv, install deps | 30 min | All imports work |
| Download YOLOv8n COCO weights | 10 min | Model loads and predicts |
| Download helmet model | 15 min | Detects helmets on test image |
| Download plate model | 15 min | Detects plates on test image |
| Install RapidOCR | 10 min | OCR works on Indian plate image |
| **Smoke test: Overhead images** | 30 min | YOLO detects persons from overhead angle on 3 Indian traffic images |
| **Smoke test: RapidOCR on Indian plates** | 15 min | Correctly reads KA-format plate |
| **Smoke test: VRAM with 2 models** | 15 min | Sequential loading works, no OOM |
| Register MapmyIndia API key | 10 min | API key received |
| Total | **~3 hours** | |

### Phase 1: CV Pipeline Core (8 hours)

| Hour | Task | Deliverable |
|------|------|-------------|
| 1 | Preprocessing module | `preprocessor.py` — CLAHE, denoise, gamma |
| 2 | Detector wrapper | `detector.py` — Sequential model loading, bbox normalization |
| 3-4 | Helmet violation logic | `violations.py` — Head-region association algorithm |
| 5-6 | Triple riding logic | `violations.py` — 2D spatial constraints |
| 7 | Evidence generation | `evidence.py` — Annotated image, SHA-256 hash |
| 8 | Pipeline integration + timing | `pipeline.py` — Waterfall timing with `time.perf_counter()` |

**Exit criteria**: Pipeline processes 5 test images end-to-end, violations detected, evidence generated.

### Phase 2: Backend + Seed Data (6 hours)

| Hour | Task | Deliverable |
|------|------|-------------|
| 1 | FastAPI app skeleton | Lifespan, CORS, static files |
| 2 | SQLite models + migration | `ViolationRecord`, `AuditEvent` tables |
| 3 | POST /api/v1/detect route | Full request/response contract |
| 4 | GET routes (violations, analytics) | Pagination, filtering, stats |
| 5 | Seed script | 200-300 violations at 8-10 real Bengaluru junctions |
| 6 | OCR integration + testing | Plate detection → RapidOCR → text extraction |

**Exit criteria**: API returns seeded data, detect route processes uploaded images.

### Phase 3: Frontend Core (8 hours)

| Hour | Task | Deliverable |
|------|------|-------------|
| 1 | React + Vite + Tailwind setup | Project skeleton, shadcn/ui init |
| 2 | Command Center Layout | Dark navy theme, BTP badge, IST clock |
| 3 | Dashboard page | Stats cards, violation feed, pipeline waterfall |
| 4 | Upload page | Drag-drop, FormData submission, bbox overlay |
| 5 | Evidence viewer | Split panel, FIR-style metadata, print button |
| 6 | Approve/Reject | Status tracking, audit trail |
| 7 | Demo mode | Zustand flag, hardcoded responses, localStorage |
| 8 | Map page | MapmyIndia + CartoDB fallback, Bengaluru polygon |

**Exit criteria**: Full user flow works — Dashboard → Upload → Evidence → Approve/Reject → Map.

### Phase 4: Polish (6 hours)

| Hour | Task | Deliverable |
|------|------|-------------|
| 1 | Violations table | Sortable, filterable, paginated |
| 2 | Analytics charts | Violations by type, junction, time |
| 3 | ROI calculator | Conservative + aggressive columns |
| 4 | Demo image curation | 5-10 high-quality demo images |
| 5 | Presentation slides | 10-slide PDF |
| 6 | Video recording | 2-minute YouTube video |

**Exit criteria**: Submission-ready product with video.

### Phase 5: Final Test + Submit (2 hours)

| Hour | Task | Deliverable |
|------|------|-------------|
| 1 | End-to-end test | Full flow on fresh machine |
| 2 | Submit | All deliverables uploaded |

### Total: 30 hours (PRE-BUILD 3h + Phase 1 8h + Phase 2 6h + Phase 3 8h + Phase 4 6h + Phase 5 2h ≈ 3 days, compressed to 2)

---

## 9. Go/No-Go Decision Points

| Checkpoint | Question | Green | Yellow | Red |
|------------|----------|-------|--------|-----|
| **PRE-BUILD** | Overhead images detectable by YOLO? | mAP >0.5 on persons | mAP 0.3-0.5 | mAP <0.3 → Pivot to evidence generator |
| **PRE-BUILD** | RapidOCR works on Indian plates? | >80% char accuracy | 50-80% | <50% → Switch to EasyOCR |
| **PRE-BUILD** | 2 YOLO models fit in VRAM? | Both load sequentially | One at a time with OOM risk | OOM → Use COCO-only, skip plate model |
| **Phase 1 Hr4** | Helmet association works? | >70% correct on test images | 50-70% | <50% → Debug or drop to P2 |
| **Phase 1 Hr6** | Triple riding detection works? | Detects on 3/5 test images | Detects on 1-2/5 | 0/5 → Drop to P2 or skip |
| **Phase 1 Hr8** | Full pipeline on 5 images? | All 5 produce results | 3-4/5 work | <3 → Activate demo mode |
| **Phase 2 Hr14** | API returns seeded data? | All endpoints respond | Most respond | None → Hardcode mock data in frontend |
| **Phase 3 Hr8** | Upload→detect→display flow? | Full flow works | Partial | Broken → Skip upload, demo mode only |

**Decision principle**: Always have a fallback. Never get stuck with no working demo.

---

## 10. Key Differentiators

### Core Product

| Differentiator | Why It Matters |
|----------------|----------------|
| **Working prototype** | Others submit concept notes; we submit running code |
| **Head-region helmet association** | Novel algorithm, not naive bbox overlap |
| **Bengaluru-specific data** | Real junctions, KA plates, local enforcement context |
| **Command Center aesthetic** | Looks like a police control room, not a dashboard template |
| **Approve/Reject workflow** | Human-in-the-loop, not autonomous surveillance |
| **Pipeline waterfall chart** | Shows exactly where time is spent — transparency |
| **MapmyIndia tiles** | Hackathon sponsor integration, shows Bengaluru focus |
| **ROI calculator** | Defensible numbers with methodology, not vibes |
| **Confidence badges** | High/Medium/Low with threshold — auditable decisions |
| **Evidence viewer** | FIR-style layout, print-ready, court-ready |
| **Inline fine info** | MV Act section + amount alongside each violation |
| **Audit trail** | Every action logged — officer accountability |

### Narrative

| Element | Purpose |
|---------|---------|
| BTP integration references (ASTraM, Vahan) | Shows pathway to real deployment |
| Edge deployment diagram | Answers "how does this scale?" |
| "AI assists" framing | Addresses surveillance concerns |
| Cost comparison (₹25K/junction vs manual) | Makes business case |
| Fine-tuning roadmap | Shows improvement path |

---

## 11. Demo Strategy

### Opening Line

> "Bengaluru has 87% contactless enforcement — but only at 75 junctions. VigilAI retrofits onto **any** CCTV."

### Live Demo Flow (3 minutes)

1. **Dashboard** (30s) — Show stats, violation feed, pipeline waterfall
2. **Upload Image** (60s) — Drag a real traffic image → detection runs → violations appear with bbox overlay
3. **Evidence Viewer** (30s) — Click a violation → split panel with annotated image + FIR metadata + license plate
4. **Approve/Reject** (15s) — Click approve → status changes → audit trail updated
5. **Map** (15s) — Show violation hotspots on Bengaluru map with MapmyIndia tiles

### Closing Line

> "₹25,000 per junction. Officer-verified. Rule 166A compliant. Ready for ASTraM integration."

### Backup Plan

| Fallback | When | How |
|----------|------|-----|
| Demo mode toggle | Backend crashes | Click "DEMO" badge → hardcoded responses |
| Pre-recorded video | Internet/laptop fails | 2-min YouTube video on phone |
| Static screenshots | Everything fails | 5 key screenshots in presentation |

---

## 12. ROI Calculator Methodology

### Source Data

| Parameter | Value | Source |
|-----------|-------|--------|
| AI-detected violations/day (current) | ~12,000 | BTP published data |
| Active AI junctions | 75 | BTP published data |
| Average fine per violation | ₹500 | MV Act Schedule |
| Compliance rate (fine collected) | 30% | Industry estimate |
| VigilAI deployment target | 500 junctions | Conservative expansion |

### Calculations

**Current Annual Recovery (75 junctions)**

```
12,000 violations/day × ₹500/violation × 365 days × 30% compliance
= ₹65,700,000
= ₹65.7 Cr/year
```

**With VigilAI — Aggressive (500 junctions)**

```
80,000 violations/day × ₹500/violation × 365 days × 30% compliance
= ₹438,000,000
= ₹438 Cr/year
```

**With VigilAI — Conservative (50% effectiveness)**

```
₹438 Cr × 50% = ₹219 Cr/year
```

**Investment**

```
500 junctions × ₹50,000/junction = ₹2,500,000,000
Wait — that's ₹2.5 Cr total, not per junction.
Correction: 500 × ₹50,000 = ₹2.5 Cr total infrastructure investment.
```

**Payback Period**

| Scenario | Annual Recovery | Investment | Payback |
|----------|----------------|------------|---------|
| Aggressive | ₹438 Cr | ₹2.5 Cr | <1 week |
| Conservative | ₹219 Cr | ₹2.5 Cr | <1 week |

### Presentation

Show BOTH columns side-by-side:

| Metric | Conservative | Aggressive |
|--------|-------------|------------|
| Junctions | 500 | 500 |
| Violations/day | 40,000 | 80,000 |
| Annual recovery | ₹219 Cr | ₹438 Cr |
| Investment | ₹2.5 Cr | ₹2.5 Cr |
| Payback | <1 week | <1 week |
| ROI (Year 1) | 87× | 175× |

**Footnote**: "Conservative assumes 50% detection effectiveness vs. existing BTP AI cameras. Aggressive assumes parity with current system."

---

## 13. Submission Deliverables Checklist

| Deliverable | Format | Max Size | Status |
|-------------|--------|----------|--------|
| Project Title | Text | — | "VigilAI — AI-Powered Traffic Violation Detection" |
| Description | Text | 500 words | Include: problem, solution, tech stack, Bengaluru focus |
| Built With | Tags | — | Python, FastAPI, YOLOv8, React, TailwindCSS |
| Screenshots | PNG/JPG | 5MB each | 3-5: Dashboard, Upload+Detection, Evidence, Map, ROI |
| Video | YouTube link | 2 min | Live demo walk-through |
| Presentation | PDF | 10 slides | See slide outline below |
| Source Code | ZIP | 50MB | Excluding weights, node_modules, __pycache__ |
| README.md | Markdown | — | Setup instructions, architecture, screenshots |
| Demo Link | URL | — | ngrok URL or Vercel deployment |

### Slide Outline (10 slides)

1. **Title Slide** — VigilAI + tagline + team
2. **Problem** — 75 junctions vs 500+, manual surveillance gap
3. **Solution** — AI-assisted violation detection pipeline
4. **Architecture** — System diagram (edge → cloud → BTP)
5. **Detection Pipeline** — Image → Preprocess → Detect → Violate → OCR → Evidence
6. **Live Demo** — Screenshots of key screens
7. **Accuracy & Metrics** — mAP, OCR accuracy, latency, confidence tiers
8. **ROI** — Conservative vs aggressive recovery estimates
9. **Roadmap** — Fine-tuning, BTP integration, edge deployment
10. **Close** — "AI assists, doesn't replace" + ASTraM ready

---

## 14. 12-Hour Cut Plan

If time is limited to 12 hours, apply these cuts:

### Keep

- Dashboard page (stats + violation feed)
- Upload page (drag-drop → detect → bbox overlay)
- Evidence viewer (split panel + metadata + print)
- BTP Command Center layout (dark navy, clock, badge)
- Pipeline waterfall chart
- Approve/Reject workflow

### Cut

| Feature | Reason | Impact |
|---------|--------|--------|
| Map page | Complex, MapmyIndia API issues possible | Low — nice visual but not core |
| Analytics charts | Recharts setup + data shaping | Low — dashboard stats suffice |
| ROI calculator | Complex math + UI | Low — cover in presentation |
| Violations table | Paginated table is time-consuming | Low — dashboard feed shows recent |
| MapmyIndia tiles | API key + integration | Low — CartoDB Dark fallback |

**Result**: 3 pages (Dashboard, Upload, Evidence) + core detection pipeline + demo mode.

---

## 15. Risk Register

| # | Risk | Probability | Impact | Mitigation | Trigger |
|---|------|-------------|--------|------------|---------|
| 1 | **Domain gap** — Overhead CCTV vs. COCO training data | HIGH | CRITICAL | Pre-build smoke test with 3 Indian overhead images; if <0.3 mAP, pivot to evidence generator | PRE-BUILD smoke test |
| 2 | **VRAM fragmentation** — OOM after multiple load/unload cycles | MEDIUM | MEDIUM | `gc.collect()` + `torch.cuda.empty_cache()` after unload; pre-load VRAM check | Any OOM error |
| 3 | **Helmet association failure** — Head-region overlap too noisy | MEDIUM | HIGH | Head-region extraction (top 30%) + validation on test images; parameter tuning | Phase 1 Hr4 |
| 4 | **Triple riding false positives** — Persons near (not on) vehicle | MEDIUM | MEDIUM | 2D spatial constraints (center alignment + vertical overlap >30%); curated demo images | Phase 1 Hr6 |
| 5 | **Frontend time overrun** — Too many pages/features | MEDIUM | HIGH | Cut to 3 pages; demo mode for anything unfinished | Phase 3 Hr6 |
| 6 | **Demo fails live** — Laptop/network issues | MEDIUM | CRITICAL | Demo mode toggle + pre-recorded backup video | During demo |
| 7 | **Phase 1 overrun** — CV pipeline takes longer than 8 hours | MEDIUM | HIGH | Go/no-go gates at Hr4 and Hr6; cut P1 violations if needed | Phase 1 checkpoints |
| 8 | **Submission incomplete** — Missing deliverables | LOW | CRITICAL | Plan each deliverable explicitly; screenshots/video early | Phase 4 |
| 9 | **MapmyIndia tiles blank** — API key issues or rate limiting | MEDIUM | MEDIUM | CartoDB Dark fallback (no API key needed) | Phase 3 Hr8 |

---

## 16. Bengaluru Demo Data Spec

### Junctions

| Junction | Latitude | Longitude | Avg Violations/Day | No Helmet % | Triple Riding % |
|----------|----------|-----------|-------------------|-------------|-----------------|
| MG Road - Trinity Circle | 12.9757 | 77.6063 | 45 | 65 | 20 |
| Silk Board Junction | 12.9177 | 77.6238 | 62 | 55 | 30 |
| Hebbal Flyover | 13.0358 | 77.5970 | 38 | 70 | 15 |
| Whitefield Main Road | 12.9698 | 77.7500 | 41 | 60 | 25 |
| Electronic City Phase 1 | 12.8456 | 77.6603 | 55 | 50 | 35 |
| Marathahalli Bridge | 12.9591 | 77.6974 | 48 | 58 | 28 |
| KR Puram Railway Junction | 12.9970 | 77.6844 | 36 | 62 | 22 |
| Yelahanka New Town | 13.1007 | 77.5963 | 25 | 72 | 12 |
| Bannerghatta Road - Jayadeva | 12.9135 | 77.5985 | 42 | 56 | 26 |
| Koramangala 100ft Road | 12.9352 | 77.6245 | 33 | 68 | 18 |

### License Plate Format

All plates use KA-format: `KA##XX####`

- `KA` — Karnataka RTO code
- `##` — District code (01-99)
- `XX` — Series letters (AA-ZZ)
- `####` — Number (0001-9999)

Example plates: `KA01AB1234`, `KA05MZ9876`, `KA03CR4521`

### Time Patterns

| Time Window | Violation Rate | Notes |
|-------------|---------------|-------|
| 06:00-09:00 | HIGH | Morning rush hour |
| 09:00-12:00 | MEDIUM | Mid-morning |
| 12:00-14:00 | LOW-MEDIUM | Lunch hour |
| 14:00-17:00 | MEDIUM | Afternoon |
| 17:00-21:00 | HIGH | Evening rush hour |
| 21:00-06:00 | LOW | Night |

### Seed Data Volume

- **200-300 total violations** across all junctions
- Distributed by junction (weighted by avg violations/day)
- Distributed by time (weighted by violation rate)
- ~45% no_helmet, ~20% triple_riding, ~15% wrong_side_driving, ~10% illegal_parking, ~10% license_plate_mismatch
- All records have `data_source: "seeded"`
- Timestamps distributed over the past 7 days

---

## 17. Key Metrics

### Performance Evaluation (Problem Statement Task 8)

The problem statement requires evaluation using Accuracy, Precision, Recall, F1-score, mAP, and computational efficiency.

| Metric | Target | How to Compute | Priority |
|--------|--------|---------------|----------|
| **mAP@50** (detection) | >0.74 | `ultralytics` built-in `model.val()` on labeled test set | P0 |
| **Precision** (per violation type) | >0.80 | TP / (TP + FP) on 50+ labeled test images | P0 |
| **Recall** (per violation type) | >0.75 | TP / (TP + FN) on 50+ labeled test images | P0 |
| **F1-score** (per violation type) | >0.77 | 2 × P × R / (P + R) | P0 |
| **Accuracy** (classification) | >0.85 | Correct classifications / total on test set | P1 |
| OCR character accuracy | >90% | Correct chars / total chars on Indian plate test set | P1 |
| Inference FPS | >25 | Frames per second on RTX 3050 (YOLOv8n FP16) | P0 |
| End-to-end latency | <3s | Upload → response (preprocess + detect + OCR + evidence) | P0 |
| Dashboard load time | <2s | Time to interactive on dashboard page | P1 |
| VRAM utilization | <3.5 GB | Peak during plate model loading | P0 |
| Scalability estimate | 500 junctions | Projected throughput at edge nodes | P2 |

### Evaluation Protocol

1. **Curate a test set** of 50+ images with ground-truth labels (manually annotated violations)
2. Run full pipeline on test set, collect predictions
3. Compute per-violation-type: TP, FP, FN → Precision, Recall, F1
4. Compute mAP@50 using `ultralytics` built-in validation
5. Compute OCR accuracy on plate crop subset
6. Report results in the presentation (slide 7: "Accuracy & Metrics")

```python
# eval_metrics.py — compute all required metrics
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score
from ultralytics import YOLO

def evaluate_pipeline(test_images_dir: str, ground_truth: list[dict]):
    """Run full pipeline on test set and compute all PS-required metrics."""
    # ... (implementation in Phase 4)
```

### System Metrics

| Metric | Target | Measurement | Priority |
|--------|--------|-------------|----------|
| Evidence image quality | Visual inspection | Bbox overlay readable, text legible | P1 |
| Confidence calibration | High tier >80% correct | Manual validation on 20 images | P2 |

---

*This document is the single source of truth for the VigilAI project. All implementation must reference this plan. Any deviation requires human consultation per AGENTS.md rules.*
