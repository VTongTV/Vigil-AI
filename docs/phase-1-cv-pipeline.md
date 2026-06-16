# Phase 1: CV Pipeline — Detailed Specification

> Phase 1 Duration: 8 hours
> Module: `src/cv/`
> Exit Criteria: Pipeline processes 5 test images end-to-end with violations + evidence

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [detector.py — YOLO Detection Wrapper](#2-detectorpy--yolo-detection-wrapper)
3. [violations.py — Violation Detection Logic](#3-violationspy--violation-detection-logic)
4. [evidence.py — Evidence Generation](#4-evidencepy--evidence-generation)
5. [pipeline.py — Pipeline Integration](#5-pipelinepy--pipeline-integration)
6. [Pre-Warm Strategy](#6-pre-warm-strategy)
7. [ONNX Runtime Thread Limits](#7-onnx-runtime-thread-limits)

---

## 1. Module Overview

### File Structure

```
src/cv/
├── __init__.py
├── preprocessor.py    # Image preprocessing (CLAHE, denoise, gamma)
├── detector.py         # YOLO model loading, inference, bbox normalization
├── violations.py       # Helmet association + triple riding logic
├── evidence.py         # Annotated image generation + hash
└── pipeline.py         # End-to-end pipeline with waterfall timing
```

### Data Flow

```
Raw Image (numpy HWC BGR)
    │
    ▼
preprocessor.py → Preprocessed Image
    │
    ▼
detector.py → Detections (persons, helmets, no-helmets, two-wheelers, plates)
    │
    ▼
violations.py → Violations (no_helmet, triple_riding)
    │
    ▼
detector.py (plate on-demand) → Plate crops
    │
    ▼
RapidOCR (CPU) → Plate text
    │
    ▼
evidence.py → Annotated image + SHA-256 hash
    │
    ▼
pipeline.py → Aggregated result with waterfall timing
```

### Bbox Coordinate Convention

All bounding boxes use **normalized coordinates** [0, 1] relative to image dimensions:

```python
# Format: [x1, y1, x2, y2] where:
# x1 = left / width
# y1 = top / height
# x2 = right / width
# y2 = bottom / height

def normalize_bbox(bbox_xyxy: list[int], img_w: int, img_h: int) -> list[float]:
    """Convert pixel coordinates to normalized [0,1] coordinates."""
    return [
        bbox_xyxy[0] / img_w,
        bbox_xyxy[1] / img_h,
        bbox_xyxy[2] / img_w,
        bbox_xyxy[3] / img_h,
    ]
```

---

## 2. detector.py — YOLO Detection Wrapper

### Class: `DetectionModel`

```python
import logging
import gc
from pathlib import Path
from typing import Optional

import torch
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class DetectionModel:
    """Manages YOLOv8n model loading, inference, and VRAM lifecycle.

    Attributes:
        model: Loaded YOLO model instance.
        model_path: Path to model weights.
        device: Target device ('cuda' or 'cpu').
        is_loaded: Whether model is currently in GPU memory.
    """

    def __init__(self, model_path: str | Path, device: str = "cuda") -> None:
        self.model_path = Path(model_path)
        self.device = device
        self.model: Optional[YOLO] = None
        self.is_loaded = False

    def load(self) -> None:
        """Load model onto device. Pre-warms with dummy inference."""
        if self.is_loaded:
            logger.warning("Model %s already loaded", self.model_path.name)
            return

        if self.device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available, falling back to CPU for %s",
                          self.model_path.name)
            self.device = "cpu"

        if self.device == "cuda":
            free_vram = torch.cuda.mem_get_info()[0] / (1024**3)
            logger.info("Pre-load VRAM: %.2f GB free", free_vram)

        self.model = YOLO(str(self.model_path))
        self.model.to(self.device)

        # Pre-warm: one dummy inference to allocate CUDA context
        import numpy as np
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self.model.predict(dummy, verbose=False, device=self.device)

        self.is_loaded = True
        if self.device == "cuda":
            used_vram = torch.cuda.memory_allocated() / (1024**3)
            logger.info("Model %s loaded. VRAM: %.2f GB",
                       self.model_path.name, used_vram)

    def predict(
        self,
        image: "np.ndarray",
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
    ) -> list[dict]:
        """Run inference on a single image.

        Args:
            image: Input image as numpy array (HWC, BGR).
            conf_threshold: Minimum confidence for detections.
            iou_threshold: NMS IoU threshold.

        Returns:
            List of detection dicts with 'class_name', 'confidence', 'bbox' (normalized).
        """
        if not self.is_loaded:
            raise RuntimeError(f"Model {self.model_path.name} not loaded. Call load() first.")

        results = self.model.predict(
            image,
            conf=conf_threshold,
            iou=iou_threshold,
            verbose=False,
            device=self.device,
        )

        img_h, img_w = image.shape[:2]
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for i in range(len(boxes)):
                xyxy = boxes.xyxy[i].cpu().numpy().tolist()
                bbox_norm = normalize_bbox(xyxy, img_w, img_h)
                detections.append({
                    "class_name": result.names[int(boxes.cls[i])],
                    "confidence": float(boxes.conf[i]),
                    "bbox": bbox_norm,
                })

        return detections

    def unload(self) -> None:
        """Unload model from GPU and reclaim VRAM."""
        if not self.is_loaded:
            return

        self.model.to("cpu")
        del self.model
        self.model = None
        self.is_loaded = False

        gc.collect()
        if self.device == "cuda":
            torch.cuda.empty_cache()
            free_vram = torch.cuda.mem_get_info()[0] / (1024**3)
            logger.info("Model %s unloaded. VRAM free: %.2f GB",
                       self.model_path.name, free_vram)

    def check_vram(self, required_gb: float = 1.5) -> bool:
        """Check if sufficient VRAM is available for loading."""
        if self.device != "cuda" or not torch.cuda.is_available():
            return self.device == "cpu"
        free_vram = torch.cuda.mem_get_info()[0] / (1024**3)
        return free_vram >= required_gb
```

### Model Loading Strategy

```python
# In pipeline.py or FastAPI lifespan
coco_helmet_model = DetectionModel("weights/coco_helmet.pt", device="cuda")
coco_helmet_model.load()  # Always loaded, ~1.5 GB

plate_model = DetectionModel("weights/plate.pt", device="cuda")
# NOT loaded at startup — loaded on-demand per request
```

### Sequential Loading Protocol

When the plate model is needed:

```python
def run_plate_detection(image, plate_model_path, coco_helmet_model):
    """Run plate detection with sequential loading."""
    plate_model = DetectionModel(plate_model_path, device="cuda")

    # Pre-check VRAM
    if not plate_model.check_vram(required_gb=1.0):
        logger.warning("Insufficient VRAM for plate model, skipping plate detection")
        return []

    # Load → infer → unload
    plate_model.load()
    detections = plate_model.predict(image)
    plate_model.unload()

    return detections
```

---

## 3. violations.py — Violation Detection Logic

### Helmet Non-Compliance Detection

**Algorithm**: Head-region spatial association

**Rationale**: In overhead/side-angle CCTV, the rider's head occupies the top portion of the person bounding box. By extracting the head region (top 30%) and checking for overlapping helmet/no-helmet detections, we can reliably determine compliance.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class HelmetViolation:
    """Result of helmet compliance check for one person."""
    person_bbox: list[float]          # [x1, y1, x2, y2] normalized
    head_bbox: list[float]            # Head region bbox
    has_helmet: bool
    helmet_confidence: float          # Confidence of helmet/no-helmet detection
    person_confidence: float          # Confidence of person detection
    violation_confidence: float       # Combined confidence for the violation

@dataclass
class TripleRidingViolation:
    """Result of triple riding check for one two-wheeler."""
    vehicle_bbox: list[float]         # [x1, y1, x2, y2] normalized
    rider_bboxes: list[list[float]]   # List of rider bboxes
    rider_count: int
    violation_confidence: float       # Min confidence among riders


# ---- Parameters ----

HEAD_REGION_RATIO = 0.30      # Top 30% of person bbox is head region
HELMET_IOU_THRESHOLD = 0.15   # Low threshold — head region is approximate
TRIPLE_RIDE_MIN_PERSONS = 3   # Minimum persons on a two-wheeler
VERTICAL_OVERLAP_THRESHOLD = 0.30  # 30% vertical overlap required
CENTER_MARGIN_RATIO = 0.50    # Person center within 50% of vehicle width


def compute_iou(box_a: list[float], box_b: list[float]) -> float:
    """Compute IoU between two normalized bboxes.

    Args:
        box_a: [x1, y1, x2, y2] in [0, 1].
        box_b: [x1, y1, x2, y2] in [0, 1].

    Returns:
        IoU value in [0.0, 1.0].
    """
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    if union <= 0.0:
        return 0.0
    return intersection / union


def extract_head_region(person_bbox: list[float], ratio: float = HEAD_REGION_RATIO) -> list[float]:
    """Extract head region from person bbox.

    The head region is the top `ratio` fraction of the person bbox.
    This works because in overhead/side-angle traffic images, the person's
    head occupies the upper portion of the bounding box.

    Args:
        person_bbox: [x1, y1, x2, y2] normalized.
        ratio: Fraction of person height for head region.

    Returns:
        Head region bbox [x1, y1, x2, head_y2] normalized.
    """
    px1, py1, px2, py2 = person_bbox
    person_h = py2 - py1
    head_y2 = py1 + person_h * ratio
    return [px1, py1, px2, head_y2]


def detect_helmet_violations(
    persons: list[dict],
    helmets: list[dict],
    no_helmets: list[dict],
    two_wheelers: list[dict],
) -> list[HelmetViolation]:
    """Detect helmet non-compliance among riders on two-wheelers.

    Algorithm:
    1. For each person near a two-wheeler, extract the head region (top 30%)
    2. Check if any helmet detection overlaps the head region (IoU > 0.15)
    3. Check if any no-helmet detection overlaps the head region
    4. If no-helmet overlaps OR no helmet overlaps → violation

    Args:
        persons: Person detections with 'bbox' and 'confidence'.
        helmets: Helmet detections with 'bbox' and 'confidence'.
        no_helmets: No-helmet detections with 'bbox' and 'confidence'.
        two_wheelers: Two-wheeler detections with 'bbox' and 'confidence'.

    Returns:
        List of HelmetViolation instances for persons without helmets.
    """
    violations = []

    for person in persons:
        px1, py1, px2, py2 = person["bbox"]

        # Only check persons near a two-wheeler
        near_vehicle = False
        for tw in two_wheelers:
            # Check if person center is within two-wheeler bbox (with margin)
            pcx = (px1 + px2) / 2
            pcy = (py1 + py2) / 2
            tw_x1, tw_y1, tw_x2, tw_y2 = tw["bbox"]
            margin = 0.05  # 5% margin
            if (tw_x1 - margin <= pcx <= tw_x2 + margin and
                tw_y1 - margin <= pcy <= tw_y2 + margin):
                near_vehicle = True
                break

        if not near_vehicle:
            continue

        # Extract head region
        head_bbox = extract_head_region(person["bbox"])

        # Check helmet overlap
        helmet_found = False
        best_helmet_conf = 0.0
        for h in helmets:
            iou = compute_iou(head_bbox, h["bbox"])
            if iou >= HELMET_IOU_THRESHOLD:
                helmet_found = True
                best_helmet_conf = max(best_helmet_conf, h["confidence"])

        # Check no-helmet overlap
        no_helmet_found = False
        best_no_helmet_conf = 0.0
        for nh in no_helmets:
            iou = compute_iou(head_bbox, nh["bbox"])
            if iou >= HELMET_IOU_THRESHOLD:
                no_helmet_found = True
                best_no_helmet_conf = max(best_no_helmet_conf, nh["confidence"])

        # Determine violation
        if no_helmet_found or not helmet_found:
            combined_conf = max(no_helmet_conf, person["confidence"]) if no_helmet_found else person["confidence"]
            violations.append(HelmetViolation(
                person_bbox=person["bbox"],
                head_bbox=head_bbox,
                has_helmet=False,
                helmet_confidence=best_no_helmet_conf,
                person_confidence=person["confidence"],
                violation_confidence=combined_conf,
            ))

    return violations
```

### Triple Riding Detection

**Algorithm**: 2D spatial constraint checking

**Rationale**: Three or more persons sharing a single two-wheeler will have overlapping bounding boxes centered on the vehicle. We use two constraints:
1. **Horizontal center alignment**: Person's horizontal center falls within the two-wheeler's horizontal extent (with margin)
2. **Vertical overlap**: Person and two-wheeler share >30% vertical extent

```python
def detect_triple_riding(
    persons: list[dict],
    two_wheelers: list[dict],
) -> list[TripleRidingViolation]:
    """Detect triple riding from person + two-wheeler detections.

    Algorithm:
    1. For each two-wheeler, find all persons whose center falls within the
       two-wheeler's bbox (with horizontal margin)
    2. Apply vertical overlap constraint (person and vehicle overlap > 30%)
    3. If 3+ persons qualify → triple riding violation

    Args:
        persons: Person detections with 'bbox' [x1,y1,x2,y2] and 'confidence'.
        two_wheelers: Two-wheeler detections with 'bbox' and 'confidence'.

    Returns:
        List of TripleRidingViolation instances.
    """
    violations = []

    for tw in two_wheelers:
        tw_x1, tw_y1, tw_x2, tw_y2 = tw["bbox"]
        tw_w = tw_x2 - tw_x1
        tw_cx = (tw_x1 + tw_x2) / 2

        riders = []

        for person in persons:
            px1, py1, px2, py2 = person["bbox"]
            p_cx = (px1 + px2) / 2

            # Constraint 1: Horizontal center alignment
            # Person center must be within two-wheeler bbox ± margin
            margin = tw_w * CENTER_MARGIN_RATIO
            if not (tw_x1 - margin <= p_cx <= tw_x2 + margin):
                continue

            # Constraint 2: Vertical overlap
            # Person and two-wheeler must overlap vertically by > threshold
            overlap_y1 = max(py1, tw_y1)
            overlap_y2 = min(py2, tw_y2)
            overlap_h = max(0.0, overlap_y2 - overlap_y1)
            person_h = py2 - py1

            if person_h <= 0:
                continue

            overlap_ratio = overlap_h / person_h
            if overlap_ratio < VERTICAL_OVERLAP_THRESHOLD:
                continue

            riders.append(person)

        if len(riders) >= TRIPLE_RIDE_MIN_PERSONS:
            min_conf = min(r["confidence"] for r in riders)
            violations.append(TripleRidingViolation(
                vehicle_bbox=tw["bbox"],
                rider_bboxes=[r["bbox"] for r in riders],
                rider_count=len(riders),
                violation_confidence=min_conf,
            ))

    return violations
```

### Parameter Summary

| Parameter | Value | Module | Rationale |
|-----------|-------|--------|-----------|
| `HEAD_REGION_RATIO` | 0.30 | Helmet | Top 30% of person bbox covers head in Indian traffic images |
| `HELMET_IOU_THRESHOLD` | 0.15 | Helmet | Low threshold because head region is approximate |
| `TRIPLE_RIDE_MIN_PERSONS` | 3 | Triple | Legal definition of triple riding |
| `VERTICAL_OVERLAP_THRESHOLD` | 0.30 | Triple | 30% ensures person is on vehicle, not standing nearby |
| `CENTER_MARGIN_RATIO` | 0.50 | Triple | 50% vehicle width margin — avoids pedestrians |

---

## 4. evidence.py — Evidence Generation

### Annotated Image Format

Evidence images are the original image with:

1. **Color-coded bbox overlays** for each violation
2. **Labels** showing violation type + confidence percentage
3. **Timestamp watermark** (bottom-right corner)
4. **VigilAI watermark** (bottom-left corner, subtle)

```python
import hashlib
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

EVIDENCE_DIR = Path("outputs/evidence")
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

COLOR_MAP = {
    "no_helmet": (0, 0, 255),         # Red (BGR)
    "triple_riding": (0, 165, 255),    # Orange (BGR)
    "license_plate": (0, 255, 255),    # Yellow (BGR)
    "person": (255, 0, 0),             # Blue (BGR)
    "helmet": (0, 255, 0),             # Green (BGR)
}

WATERMARK_TEXT = "VigilAI"
FONT = cv2.FONT_HERSHEY_SIMPLEX


def generate_evidence_image(
    image: np.ndarray,
    violations: list[dict],
    image_id: str,
) -> tuple[str, str]:
    """Generate annotated evidence image with violation bboxes.

    Args:
        image: Original image as numpy array (HWC, BGR).
        violations: List of violation dicts with 'type', 'bbox', 'confidence'.
        image_id: Unique identifier for this detection run.

    Returns:
        Tuple of (evidence_url_path, sha256_hash).
        evidence_url_path: Relative URL path like /evidence/img_20260616_143022_a3f2.jpg
        sha256_hash: SHA-256 hash of the evidence image file.
    """
    annotated = image.copy()
    img_h, img_w = annotated.shape[:2]

    for v in violations:
        vtype = v["type"]
        color = COLOR_MAP.get(vtype, (255, 255, 255))
        bbox = v["bbox"]  # [x1, y1, x2, y2] normalized

        # Denormalize bbox
        x1 = int(bbox[0] * img_w)
        y1 = int(bbox[1] * img_h)
        x2 = int(bbox[2] * img_w)
        y2 = int(bbox[3] * img_h)

        # Draw bbox
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        # Draw label
        label = f"{vtype} {v['confidence']:.0%}"
        (label_w, label_h), _ = cv2.getTextSize(label, FONT, 0.5, 1)
        cv2.rectangle(annotated, (x1, y1 - label_h - 8), (x1 + label_w + 4, y1), color, -1)
        cv2.putText(annotated, label, (x1 + 2, y1 - 6), FONT, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

    # Timestamp watermark (bottom-right)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
    cv2.putText(annotated, timestamp, (img_w - 280, img_h - 12), FONT, 0.5, (200, 200, 200), 1, cv2.LINE_AA)

    # VigilAI watermark (bottom-left)
    cv2.putText(annotated, WATERMARK_TEXT, (10, img_h - 12), FONT, 0.5, (150, 150, 150), 1, cv2.LINE_AA)

    # Save evidence image
    now = datetime.now()
    short_hash = hashlib.sha256(image.tobytes()).hexdigest()[:4]
    filename = f"img_{now.strftime('%Y%m%d_%H%M%S')}_{short_hash}.jpg"
    filepath = EVIDENCE_DIR / filename
    cv2.imwrite(str(filepath), annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])

    # Compute SHA-256 of saved file
    sha256 = hashlib.sha256(filepath.read_bytes()).hexdigest()
    evidence_hash = f"sha256:{sha256}"

    # Relative URL path for StaticFiles mount
    evidence_url = f"/evidence/{filename}"

    return evidence_url, evidence_hash
```

### File Naming Convention

```
img_{YYYYMMDD}_{HHMMSS}_{sha256_prefix_4chars}.jpg
```

Example: `img_20260616_143022_a3f2.jpg`

- `20260616` — Date
- `143022` — Time (HHMMSS)
- `a3f2` — First 4 hex chars of SHA-256 of original image (uniqueness)

### SHA-256 Hash

- Computed on the **saved evidence image file** (not the original image)
- Format: `sha256:{hex_digest}`
- Purpose: Tamper detection, chain of custody

---

## 5. pipeline.py — Pipeline Integration

### Pipeline with Waterfall Timing

Every stage is timed with `time.perf_counter()` for the waterfall chart:

```python
import time
import logging
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class PipelineResult:
    """Result of the full detection pipeline."""
    violations: list[dict] = field(default_factory=list)
    evidence_url: str = ""
    evidence_hash: str = ""
    image_id: str = ""
    pipeline_timing: dict[str, float] = field(default_factory=dict)
    detection_counts: dict[str, int] = field(default_factory=dict)


class CVPipeline:
    """End-to-end computer vision pipeline for violation detection.

    Orchestrates preprocessing, detection, violation analysis, OCR,
    and evidence generation with waterfall timing.
    """

    def __init__(
        self,
        coco_helmet_model_path: str,
        plate_model_path: str,
        device: str = "cuda",
    ) -> None:
        self.coco_helmet_model = DetectionModel(coco_helmet_model_path, device=device)
        self.plate_model_path = plate_model_path
        self.device = device
        self._ocr_engine = None

    def load(self) -> None:
        """Load resident models at startup."""
        self.coco_helmet_model.load()
        logger.info("CVPipeline ready. Resident model loaded.")

    @property
    def ocr_engine(self):
        """Lazy-load RapidOCR on first use (CPU only)."""
        if self._ocr_engine is None:
            from rapidocr_onnxruntime import RapidOCR
            self._ocr_engine = RapidOCR()
        return self._ocr_engine

    def process(self, image: np.ndarray) -> PipelineResult:
        """Process a single image through the full pipeline.

        Args:
            image: Input image as numpy array (HWC, BGR).

        Returns:
            PipelineResult with violations, evidence, and timing.
        """
        result = PipelineResult()
        timings: dict[str, float] = {}

        # Stage 1: Preprocessing
        t0 = time.perf_counter()
        processed = self._preprocess(image)
        timings["preprocessing_ms"] = (time.perf_counter() - t0) * 1000

        # Stage 2: Detection (COCO + Helmet)
        t0 = time.perf_counter()
        detections = self.coco_helmet_model.predict(processed)
        timings["detection_ms"] = (time.perf_counter() - t0) * 1000

        # Categorize detections
        persons = [d for d in detections if d["class_name"] in ("person", "Person")]
        helmets = [d for d in detections if d["class_name"] in ("helmet", "Helmet")]
        no_helmets = [d for d in detections if d["class_name"] in ("no-helmet", "no_helmet", "No Helmet")]
        two_wheelers = [d for d in detections if d["class_name"] in ("motorcycle", "Motorcycle", "bike", "Bike")]

        result.detection_counts = {
            "persons": len(persons),
            "helmets": len(helmets),
            "no_helmets": len(no_helmets),
            "two_wheelers": len(two_wheelers),
        }

        # Stage 3: Violation Analysis
        t0 = time.perf_counter()
        violations = []

        # 3a: Helmet violations
        helmet_violations = detect_helmet_violations(persons, helmets, no_helmets, two_wheelers)
        for hv in helmet_violations:
            violations.append({
                "type": "no_helmet",
                "confidence": hv.violation_confidence,
                "bbox": hv.person_bbox,
                "person_bbox": hv.person_bbox,
                "head_bbox": hv.head_bbox,
                "metadata": {"helmet_detected": hv.has_helmet, "helmet_confidence": hv.helmet_confidence},
                "mv_act_section": "129",
                "fine_amount": 500,
            })

        # 3b: Triple riding violations
        triple_violations = detect_triple_riding(persons, two_wheelers)
        for tv in triple_violations:
            violations.append({
                "type": "triple_riding",
                "confidence": tv.violation_confidence,
                "bbox": tv.vehicle_bbox,
                "rider_count": tv.rider_count,
                "rider_bboxes": tv.rider_bboxes,
                "vehicle_bbox": tv.vehicle_bbox,
                "metadata": {"rider_count": tv.rider_count},
                "mv_act_section": "184",
                "fine_amount": 1000,
            })

        timings["violation_ms"] = (time.perf_counter() - t0) * 1000

        # Stage 4: License Plate Detection (on-demand)
        t0 = time.perf_counter()
        plate_crops = []
        if violations:
            plate_model = DetectionModel(self.plate_model_path, device=self.device)
            if plate_model.check_vram(required_gb=1.0):
                plate_model.load()
                plate_detections = plate_model.predict(processed)
                plate_model.unload()

                # Crop plate regions from original image
                img_h, img_w = image.shape[:2]
                for pd in plate_detections:
                    x1 = int(pd["bbox"][0] * img_w)
                    y1 = int(pd["bbox"][1] * img_h)
                    x2 = int(pd["bbox"][2] * img_w)
                    y2 = int(pd["bbox"][3] * img_h)
                    crop = image[y1:y2, x1:x2]
                    if crop.size > 0:
                        plate_crops.append((crop, pd["bbox"], pd["confidence"]))

        timings["plate_ms"] = (time.perf_counter() - t0) * 1000

        # Stage 5: OCR
        t0 = time.perf_counter()
        for crop, bbox, det_conf in plate_crops:
            ocr_result, _ = self.ocr_engine(crop)
            if ocr_result:
                plate_text = ocr_result[0][0]  # First result, text
                ocr_conf = ocr_result[0][1]    # First result, confidence
                # Associate with nearest violation
                # (simplified: attach to first violation)
                if violations and not any(v.get("license_plate") for v in violations):
                    violations[0]["license_plate"] = {
                        "text": plate_text,
                        "confidence": ocr_conf,
                        "bbox": bbox,
                    }
        timings["ocr_ms"] = (time.perf_counter() - t0) * 1000

        # Stage 6: Evidence Generation
        t0 = time.perf_counter()
        image_id = f"img_{time.strftime('%Y%m%d_%H%M%S')}"
        evidence_url, evidence_hash = generate_evidence_image(
            image, violations, image_id
        )
        timings["evidence_ms"] = (time.perf_counter() - t0) * 1000

        # Finalize
        timings["total_ms"] = sum(timings.values())
        result.violations = violations
        result.evidence_url = evidence_url
        result.evidence_hash = evidence_hash
        result.image_id = image_id
        result.pipeline_timing = timings

        logger.info("Pipeline complete: %d violations, %.0fms total",
                   len(violations), timings["total_ms"])

        return result

    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        """Apply preprocessing pipeline.

        1. CLAHE (contrast enhancement)
        2. Denoise (bilateral filter)
        3. Gamma correction (brighten dark images)
        """
        # CLAHE on luminance channel
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        lab = cv2.merge([l, a, b])
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # Bilateral filter (edge-preserving denoise)
        result = cv2.bilateralFilter(result, d=5, sigmaColor=25, sigmaSpace=25)

        # Gamma correction (gamma=1.2 for slight brightening)
        gamma = 1.2
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
        result = cv2.LUT(result, table)

        return result
```

### Waterfall Chart Data Format

```json
{
  "preprocessing_ms": 45,
  "detection_ms": 187,
  "violation_ms": 12,
  "plate_ms": 95,
  "ocr_ms": 234,
  "evidence_ms": 89,
  "total_ms": 662
}
```

The frontend renders this as a horizontal stacked bar chart showing each stage's contribution to total latency.

---

## 6. Pre-Warm Strategy

### Why Pre-Warm

The first YOLOv8 inference is significantly slower than subsequent ones because:
1. CUDA context allocation
2. cuDNN kernel autotuning
3. Memory allocation for tensors

### Implementation

Pre-warm happens in the FastAPI lifespan event:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load and pre-warm COCO+Helmet model
    pipeline = CVPipeline(
        coco_helmet_model_path="weights/coco_helmet.pt",
        plate_model_path="weights/plate.pt",
    )
    pipeline.load()

    # Pre-warm with dummy inference
    import numpy as np
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    _ = pipeline.coco_helmet_model.predict(dummy)

    app.state.pipeline = pipeline
    logger.info("Pipeline pre-warmed and ready")

    yield

    # Cleanup
    del app.state.pipeline
    torch.cuda.empty_cache()
    logger.info("Pipeline cleaned up")
```

### Timing Expectation

| Stage | First Run (cold) | Second Run (warm) |
|-------|-------------------|--------------------|
| YOLOv8n inference | 2-5 seconds | 30-80 ms |
| Preprocessing | 50-100 ms | 50-100 ms |
| Evidence generation | 100-200 ms | 100-200 ms |

---

## 7. ONNX Runtime Thread Limits

### Configuration

RapidOCR uses ONNX Runtime on CPU. We must limit thread count to avoid contention with YOLOv8 GPU inference:

```python
import onnxruntime as ort

# Set before importing RapidOCR
ort.set_default_logger_severity(3)  # Warning level only

session_options = ort.SessionOptions()
session_options.intra_op_num_threads = 4
session_options.inter_op_num_threads = 4
session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
```

### Environment Variables

```bash
OMP_NUM_THREADS=4
ONNX_NUM_THREADS=4
```

### Verification

After loading RapidOCR, verify it's using CPU only:

```python
def verify_ocr_cpu_only(ocr_engine) -> None:
    """Verify RapidOCR is using CPU, not GPU."""
    if hasattr(ocr_engine, 'engine') and hasattr(ocr_engine.engine, 'providers'):
        providers = ocr_engine.engine.providers
        assert "CUDAExecutionProvider" not in providers, \
            f"RapidOCR using GPU! Providers: {providers}"
    logger.info("RapidOCR verified: CPU-only execution")
```

---

## Exit Criteria Checklist

- [ ] `preprocessor.py` — CLAHE + denoise + gamma pipeline
- [ ] `detector.py` — Sequential model loading with VRAM checks
- [ ] `violations.py` — Helmet head-region association (head_ratio=0.30, iou=0.15)
- [ ] `violations.py` — Triple riding 2D constraints (overlap=0.30, center=0.50)
- [ ] `evidence.py` — Annotated image with bbox, labels, watermarks, SHA-256
- [ ] `pipeline.py` — End-to-end with waterfall timing
- [ ] Pipeline processes 5 test images successfully
- [ ] Total latency < 5s per image
- [ ] VRAM usage < 3.5 GB at peak
- [ ] No CUDA errors or OOM
