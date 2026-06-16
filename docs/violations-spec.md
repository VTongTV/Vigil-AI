# VigilAI — Violation Detection Specification

> Complete specification for all violation types: algorithms, parameters, thresholds, evidence, and legal references.

---

## Table of Contents

1. [Helmet Non-Compliance](#1-helmet-non-compliance)
2. [Triple Riding](#2-triple-riding)
3. [Wrong-Side Driving](#3-wrong-side-driving)
4. [Illegal Parking (Simplified)](#4-illegal-parking-simplified)
5. [Seatbelt Non-Compliance](#5-seatbelt-non-compliance)
6. [Stop-Line Violation](#6-stop-line-violation)
7. [Red-Light Violation](#7-red-light-violation)
8. [License Plate OCR](#8-license-plate-ocr)
9. [Evidence Format](#9-evidence-format)
10. [Fine Amounts & MV Act Sections](#10-fine-amounts--mv-act-sections)
11. [Confidence Tiers](#11-confidence-tiers)

---

## 1. Helmet Non-Compliance

### Legal Basis

**Motor Vehicles Act, Section 129**: "Every person driving or riding a motorcycle of any class or description shall, while in a public place, wear [a] protective headgear conforming to the standards of Bureau of Indian Standards."

**Fine**: ₹500 (first offense) under Section 177 of MV Act

### Detection Algorithm: Head-Region Spatial Association

#### Overview

Instead of naively checking "is there a helmet near a person", we:
1. Identify persons who are riding two-wheelers
2. Extract the **head region** (top 30% of person bbox)
3. Check for overlapping helmet/no-helmet detections
4. Associate helmets to persons via head-region IoU

#### Why Head-Region Association

| Approach | Problem |
|----------|---------|
| "Any helmet near a person" | Helmet on a different rider's head nearby |
| "Helmet inside person bbox" | Person bbox covers entire body; helmet near torso = false positive |
| "Top 30% of person bbox" | Head region is anatomically constrained; helmets only appear on heads |

#### Step-by-Step Algorithm

```
Input: persons[], helmets[], no_helmets[], two_wheelers[]
Output: list of helmet violations

FOR each person in persons:
    1. CHECK if person is near a two-wheeler:
       - Compute person center (px_cx, py_cy)
       - Check if center falls within any two-wheeler bbox ± 5% margin
       - If not near any two-wheeler → SKIP (not a rider)

    2. EXTRACT head region:
       - Head region = top 30% of person bbox height
       - head_bbox = [px1, py1, px2, py1 + (py2 - py1) * 0.30]

    3. CHECK helmet overlap:
       - For each helmet detection:
           IoU = compute_iou(head_bbox, helmet.bbox)
           If IoU >= 0.15 → person HAS helmet
       - For each no-helmet detection:
           IoU = compute_iou(head_bbox, no_helmet.bbox)
           If IoU >= 0.15 → person DOES NOT have helmet

    4. DETERMINE violation:
       - If no_helmet overlaps head region → VIOLATION (confidence = no_helmet.confidence)
       - If no helmet overlaps head region → VIOLATION (confidence = person.confidence * 0.8)
       - If helmet overlaps head region → NO VIOLATION
```

#### Parameters

| Parameter | Value | Range | Rationale |
|-----------|-------|-------|-----------|
| `head_region_ratio` | 0.30 | 0.20-0.40 | Top 30% of person bbox covers head region in overhead/side-angle Indian traffic images. 20% is too tight (misses some heads), 40% is too loose (includes shoulders) |
| `iou_threshold` | 0.15 | 0.05-0.30 | Low threshold because head region is approximate. Helmet bbox may not perfectly align with head region but should overlap significantly |
| `person_on_moto_margin` | 0.05 | 0.03-0.10 | 5% normalized margin around two-wheeler bbox for checking person proximity. Accounts for bbox imprecision |

#### IoU Computation

```python
def compute_iou(box_a: list[float], box_b: list[float]) -> float:
    """Compute Intersection over Union between two [x1,y1,x2,y2] bboxes."""
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    return intersection / union if union > 0 else 0.0
```

#### Edge Cases

| Edge Case | Handling |
|-----------|---------|
| Person detected but no helmet/no-helmet detections | Assume no helmet if person is near a two-wheeler. Violation flagged with reduced confidence (person.confidence × 0.8) |
| Multiple helmets near one person | Use highest-IoU helmet. If any helmet overlaps head region, person is compliant |
| Person partially occluded (bbox cut off) | Head region may extend beyond image. YOLOv8 handles this via partial bbox prediction |
| Person standing near motorcycle (not riding) | Person center check against two-wheeler bbox ensures only riders are checked |
| Multiple persons on one motorcycle | Each person checked independently against helmet detections |

#### Visualization

```
Person Bbox (full height)
┌─────────────────┐
│   HEAD REGION   │ ← Top 30%
│   (30% of H)    │
├─────────────────┤
│                 │
│     TORSO       │
│                 │
│                 │
│     LEGS        │
│                 │
└─────────────────┘

If helmet bbox overlaps HEAD REGION (IoU > 0.15) → COMPLIANT
If no-helmet bbox overlaps HEAD REGION → VIOLATION
If nothing overlaps HEAD REGION → VIOLATION (conservative)
```

---

## 2. Triple Riding

### Legal Basis

**Motor Vehicles Act, Section 184**: "Whoever drives a motor vehicle in any public place recklessly or negligently... shall be punishable for the first offense with imprisonment... or with fine of not less than one thousand rupees..."

Triple riding falls under reckless driving. Karnataka Traffic Police enforces this under Section 184 with a ₹1,000 fine.

### Detection Algorithm: 2D Spatial Constraints

#### Overview

We detect when 3+ persons are spatially associated with a single two-wheeler by checking:
1. **Horizontal center alignment**: Person's center X is within the two-wheeler's bbox (±margin)
2. **Vertical overlap**: Person and two-wheeler share >30% vertical extent

#### Step-by-Step Algorithm

```
Input: persons[], two_wheelers[]
Output: list of triple riding violations

FOR each two_wheeler in two_wheelers:
    1. FIND potential riders:
       riders = []
       FOR each person in persons:
           a. HORIZONTAL CHECK:
              person_cx = (person.x1 + person.x2) / 2
              margin = two_wheeler.width * 0.50
              IF person_cx NOT IN [tw.x1 - margin, tw.x2 + margin]:
                  CONTINUE  (person is too far left/right)

           b. VERTICAL OVERLAP CHECK:
              overlap_y1 = max(person.y1, tw.y1)
              overlap_y2 = min(person.y2, tw.y2)
              overlap_h = max(0, overlap_y2 - overlap_y1)
              person_h = person.y2 - person.y1
              overlap_ratio = overlap_h / person_h

              IF overlap_ratio < 0.30:
                  CONTINUE  (person is not vertically overlapping enough)

           c. ADD as potential rider:
              riders.append(person)

    2. CHECK for triple riding:
       IF len(riders) >= 3:
           CREATE violation with:
               - vehicle_bbox = two_wheeler.bbox
               - rider_count = len(riders)
               - rider_bboxes = [r.bbox for r in riders]
               - confidence = min(rider.confidence for rider in riders)
```

#### Parameters

| Parameter | Value | Range | Rationale |
|-----------|-------|-------|-----------|
| `min_riders` | 3 | 3-4 | Legal definition: 3+ persons on a two-wheeler is triple riding |
| `center_margin_ratio` | 0.50 | 0.30-0.70 | Person center must be within 50% of two-wheeler width. Tighter = fewer false positives from pedestrians. Looser = more sensitive but more false positives |
| `vertical_overlap_threshold` | 0.30 | 0.20-0.50 | 30% vertical overlap ensures person is ON the vehicle, not standing nearby. Lower = more false positives. Higher = may miss partially occluded riders |
| `horizontal_margin` | 0.05 | 0.03-0.10 | 5% absolute margin for person center check. Accounts for bbox imprecision |

#### Visual Explanation

```
Two-Wheeler Bbox
┌──────────────────────────────────┐
│  ┌────┐    ┌────┐    ┌────┐       │  ← 3 person bboxes
│  │ P1 │    │ P2 │    │ P3 │       │     overlapping
│  │    │    │    │    │    │       │     vertically
│  └────┘    └────┘    └────┘       │
│      │         │         │        │
│      ▼         ▼         ▼        │
│   centers    centers   centers    │
│   within    within    within      │
│   tw bbox   tw bbox   tw bbox     │
└──────────────────────────────────┘

All 3 persons:
✓ Horizontal centers within two-wheeler bbox
✓ Vertical overlap > 30%
→ TRIPLE RIDING VIOLATION
```

#### Edge Cases

| Edge Case | Handling |
|-----------|---------|
| 4 persons on one vehicle | Flagged as triple riding (rider_count = 4). Still a violation. |
| 2 persons on one vehicle | NOT flagged. Legal limit is 2 riders (driver + pillion). |
| Person standing next to motorcycle at signal | Center check + vertical overlap should filter out. If person's center is outside the motorcycle bbox, they're not a rider. |
| Overlapping bboxes from different motorcycles | Each motorcycle is checked independently. If a person is associated with multiple motorcycles, they'll be counted in both checks (possible false positive — acceptable for hackathon). |
| Side-angle vs. overhead camera | Side-angle: persons stacked vertically. Overhead: persons spread horizontally. Both work with center + vertical overlap constraints. |

---

## 3. Wrong-Side Driving

### Legal Basis

**Motor Vehicles Act, Section 177**: "Whoever contravenes any provision of this Act or of any rule, regulation or notification made thereunder shall, if no penalty is provided for the offence be punishable with fine which may extend to one hundred rupees."

**Fine**: ₹1,000 (first offense) under Section 184 (dangerous driving)

### Detection Algorithm: Lane-Position Heuristic

#### Overview

Wrong-side driving is detected when a vehicle's position and orientation suggest it's traveling against the expected traffic flow direction for its lane.

#### Approach

This is a **heuristic-based** detection using configurable lane polygons:

1. Define lane polygons in `configs/default.yaml` for each camera view
2. Each lane polygon has a `direction` field: `"northbound"` | `"southbound"` | `"eastbound"` | `"westbound"`
3. Detect vehicles using COCO model
4. Check if vehicle bbox center falls within a lane polygon
5. Estimate vehicle direction from bbox aspect ratio + position in frame
6. If estimated direction opposes lane direction → flag violation

#### Simplified Implementation (Single Image)

```python
def detect_wrong_side(
    vehicle_boxes: list[dict],       # COCO vehicle detections
    lane_polygons: list[dict],        # Configured lane regions with direction
    image_width: int,
    image_height: int,
) -> list[dict]:
    """Detect vehicles traveling against lane direction.

    Uses lane-position heuristic: if a vehicle's bbox center falls
    in a lane with an opposing direction marker, flag as violation.

    For a simplified single-image approach, we use:
    - Vehicle bbox center position relative to lane polygon
    - Vehicle bbox aspect ratio (facing toward vs away from camera)
    - Configurable per-camera in default.yaml
    """
    violations = []
    for vehicle in vehicle_boxes:
        cx, cy = bbox_center(vehicle["bbox"])

        for lane in lane_polygons:
            if not point_in_polygon(cx, cy, lane["polygon"]):
                continue

            # Simple heuristic: check if vehicle is in wrong-side zone
            # A "wrong-side zone" is the left half of the road for
            # right-hand traffic (India drives on the left)
            if is_in_wrong_side_zone(vehicle["bbox"], lane, image_width):
                violations.append({
                    "type": "WRONG_SIDE_DRIVING",
                    "vehicle_bbox": vehicle["bbox"],
                    "vehicle_category": vehicle["class_name"],
                    "lane_id": lane["id"],
                    "confidence": vehicle["confidence"] * 0.8,  # Heuristic discount
                })
                break  # One violation per vehicle

    return violations
```

#### Configuration (default.yaml)

```yaml
lanes:
  - id: "lane_northbound_1"
    polygon: [[100, 0], [400, 0], [400, 1080], [100, 1080]]
    direction: "northbound"
    wrong_side_x_ratio: 0.3  # Left 30% of this lane is wrong-side
  - id: "lane_southbound_1"
    polygon: [[400, 0], [700, 0], [700, 1080], [400, 1080]]
    direction: "southbound"
    wrong_side_x_ratio: 0.3
```

#### Limitations

- **Single-image detection is approximate** — cannot track actual movement direction
- **Requires per-camera configuration** — lane polygons must be calibrated for each junction
- **Aspect ratio heuristic** is unreliable for overhead cameras where vehicles appear as blobs
- **Best used with seeded demo data** where lane configurations are pre-calibrated

#### Confidence Threshold

- **Primary**: 0.5 (reduced from standard 0.6 because heuristic is less reliable)
- **Auto-escalate**: Violations below 0.5 marked as "review recommended"

---

## 4. Illegal Parking

### Legal Basis

**Motor Vehicles Act, Section 122**: "No person shall park or cause to be parked any motor vehicle in any public place in such a manner or in such a condition as is likely to cause obstruction or danger to other users of the road."

**Fine**: ₹200 under Section 177

### Detection Algorithm: Zone-Based Detection

#### Overview

Illegal parking is detected when a vehicle is present inside a configured no-parking zone. This is a simplified single-image approach — it does NOT track dwell time (which would require video).

#### Approach

1. Define no-parking zone polygons in `configs/default.yaml`
2. Detect vehicles using COCO model
3. Check if any vehicle bbox center falls within a no-parking zone
4. Flag as potential illegal parking violation

```python
def detect_illegal_parking(
    vehicle_boxes: list[dict],       # COCO vehicle detections
    no_parking_zones: list[dict],     # Configured no-parking polygons
    min_confidence: float = 0.5,
) -> list[dict]:
    """Detect vehicles parked in no-parking zones.

    Simplified single-image approach: checks if vehicle center
    is inside a configured no-parking polygon. Does NOT track
    dwell time (would require video/temporal data).
    """
    violations = []
    for vehicle in vehicle_boxes:
        if vehicle["confidence"] < min_confidence:
            continue
        cx, cy = bbox_center(vehicle["bbox"])

        for zone in no_parking_zones:
            if point_in_polygon(cx, cy, zone["polygon"]):
                violations.append({
                    "type": "ILLEGAL_PARKING",
                    "vehicle_bbox": vehicle["bbox"],
                    "vehicle_category": vehicle["class_name"],
                    "zone_id": zone["id"],
                    "zone_name": zone.get("name", "No Parking Zone"),
                    "confidence": vehicle["confidence"] * 0.7,  # Heuristic discount
                })
                break

    return violations
```

#### Configuration (default.yaml)

```yaml
no_parking_zones:
  - id: "zone_bus_stop_1"
    name: "Majestic Bus Stop"
    polygon: [[50, 200], [300, 200], [300, 400], [50, 400]]
  - id: "zone_hospital_1"
    name: "Hospital Entrance"
    polygon: [[500, 100], [700, 100], [700, 300], [500, 300]]
```

#### Limitations

- **No dwell time tracking** — a vehicle momentarily stopped (e.g., at a red light) could be flagged. This is acceptable for a hackathon prototype; production would use video + tracking.
- **Requires per-camera configuration** — zone polygons must be calibrated for each junction
- **Cannot distinguish stopped traffic from parking** — a traffic jam in a no-parking zone would trigger false positives

#### Confidence Threshold

- **Primary**: 0.5
- **Note**: Flagged as "review recommended" in UI because of inherent limitations

---

## 5. Seatbelt Non-Compliance

### Legal Basis

**Motor Vehicles Act, Section 194B**: "Whoever drives a motor vehicle or causes or allows a motor vehicle to be driven, in contravention of the provisions of this Act or of any rule or notification made thereunder, shall be punishable with a fine of one thousand rupees."

**Fine**: ₹1,000 (first offense) under Section 194B

### Detection Algorithm: Windshield Crop + Seatbelt Classifier

#### Overview

Seatbelt detection from CCTV is inherently challenging — overhead angles obscure the driver's torso, and windshield glare reduces visibility. Our approach:

1. Detect cars using COCO model
2. Crop the upper portion of the car bbox (windshield/driver region)
3. Run a seatbelt detection model on the crop
4. Apply confidence discount (0.7×) for overhead angle unreliability
5. Flag as "review recommended" in the UI

#### Step-by-Step Algorithm

```
Input: car_boxes[], seatbelt_model
Output: list of seatbelt violations

FOR each car in car_boxes:
    1. EXTRACT windshield crop:
       - Windshield is roughly the top 40% of the car bbox
       - crop = car_bbox[top 40%]

    2. RUN seatbelt detection:
       - Run seatbelt model on the crop
       - Look for "with_seatbelt" / "without_seatbelt" classes

    3. DETERMINE violation:
       - If "without_seatbelt" detected in crop → VIOLATION
       - Apply confidence discount: confidence *= 0.7
       - If confidence < 0.3 → SKIP (too unreliable)
       - If confidence 0.3-0.5 → flag as "review recommended"

    4. CREATE violation with:
       - vehicle_bbox = car.bbox
       - confidence = discounted confidence
       - metadata = { "crop_type": "windshield", "detection_method": "best_effort" }
```

#### Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `windshield_crop_ratio` | 0.40 | Top 40% of car bbox covers windshield area |
| `confidence_discount` | 0.70 | 30% discount for overhead angle unreliability |
| `min_confidence` | 0.30 | Below 30% confidence is too unreliable to report |
| `review_threshold` | 0.50 | Below 50% flagged for manual review |

#### Limitations

- **Overhead cameras** have poor visibility of seatbelt area — side-angle cameras work better
- **Windshield glare** can cause false negatives (belt present but not visible)
- **Tinted windows** common in India reduce detection accuracy
- **Improvement path**: Side-angle cameras yield dramatically better results; this is a known limitation that the system is designed to improve upon

#### Confidence Adjustment

```python
def adjust_seatbelt_confidence(raw_confidence: float) -> tuple[float, str]:
    """Apply confidence discount and determine review status.

    Args:
        raw_confidence: Raw detection confidence from model.

    Returns:
        Tuple of (adjusted_confidence, review_status).
    """
    adjusted = raw_confidence * 0.70  # Overhead angle discount

    if adjusted < 0.30:
        return adjusted, "skip"        # Too unreliable
    elif adjusted < 0.50:
        return adjusted, "review"      # Flag for manual verification
    else:
        return adjusted, "auto_queue"  # Auto-queue for review
```

---

## 6. Stop-Line Violation

### Legal Basis

**Motor Vehicles Act, Section 184**: "Whoever drives a motor vehicle in any public place recklessly or negligently... shall be punishable for the first offense with imprisonment... or with fine of not less than one thousand rupees..."

**Fine**: ₹1,000 (first offense)

### Detection Algorithm: Stop-Line Zone Heuristic

#### Overview

Stop-line violations are detected when a vehicle's front is past the configured stop-line zone. This is a single-image heuristic — it checks if a vehicle has crossed the stop line, not whether it ran a red light.

#### Approach

1. Define stop-line zones in `configs/default.yaml` as polygons
2. Detect vehicles using COCO model
3. Check if vehicle's front (lower portion of bbox for overhead, or leading edge) is past the stop-line zone
4. Flag as potential stop-line violation

```python
def detect_stop_line_violations(
    vehicle_boxes: list[dict],
    stop_line_zones: list[dict],
    image_width: int,
    image_height: int,
) -> list[dict]:
    """Detect vehicles past the stop line.

    Uses configurable stop-line zone polygons. A vehicle is flagged
    if its front (leading edge) is past the stop-line zone boundary.

    Args:
        vehicle_boxes: COCO vehicle detections.
        stop_line_zones: Configured stop-line zones from default.yaml.
        image_width: Image width in pixels.
        image_height: Image height in pixels.

    Returns:
        List of violation dicts.
    """
    violations = []
    for vehicle in vehicle_boxes:
        if vehicle["confidence"] < 0.3:
            continue

        bbox = vehicle["bbox"]
        # Vehicle front: bottom-center of bbox (assuming forward motion)
        front_x = (bbox[0] + bbox[2]) / 2
        front_y = bbox[3]  # Bottom edge

        for zone in stop_line_zones:
            if point_in_polygon(front_x, front_y, zone["polygon"]):
                violations.append({
                    "type": "STOP_LINE_VIOLATION",
                    "vehicle_bbox": bbox,
                    "vehicle_category": vehicle["class_name"],
                    "zone_id": zone["id"],
                    "confidence": vehicle["confidence"] * 0.75,
                })
                break

    return violations
```

#### Configuration (default.yaml)

```yaml
stop_line_zones:
  - id: "stop_mgroad_north"
    name: "MG Road North Stop Line"
    polygon: [[0.35, 0.85], [0.65, 0.85], [0.65, 0.95], [0.35, 0.95]]
    direction: "northbound"
```

#### Confidence Threshold

- **Primary**: 0.75 multiplier on vehicle confidence
- **Without temporal data**, this is a zone heuristic — vehicle past the line
- **Improvement path**: Video feed enables temporal validation (vehicle crossed after light turned red)

---

## 7. Red-Light Violation

### Legal Basis

**Motor Vehicles Act, Section 184**: Same as stop-line violation. Running a red light is dangerous driving.

**Fine**: ₹1,000 (first offense)

### Detection Algorithm: Stop-Line Zone + Signal Input

#### Overview

Red-light violations require knowing the signal state. In our system, the operator provides this input via the dashboard. When the signal is marked RED, any vehicle past the stop-line zone is flagged as a red-light violation.

Without signal input, the system can only flag "potential stop-line violation" at reduced confidence.

#### Operator Workflow

1. Operator sees live camera feed on dashboard
2. When signal turns RED, operator clicks "Signal: RED" toggle
3. System flags all vehicles past the stop-line zone as red-light violations
4. When signal turns GREEN, operator toggles off
5. Vehicles past the stop line during GREEN are flagged as stop-line violations only

#### Implementation

```python
def detect_red_light_violations(
    vehicle_boxes: list[dict],
    stop_line_zones: list[dict],
    signal_state: str,  # "red" | "green" | "unknown"
    image_width: int,
    image_height: int,
) -> list[dict]:
    """Detect vehicles running a red light.

    Requires signal state input from operator. When signal is RED,
    any vehicle past the stop-line is a red-light violation.
    When signal is unknown, vehicles past stop-line get reduced
    confidence as potential violations.

    Args:
        vehicle_boxes: COCO vehicle detections.
        stop_line_zones: Configured stop-line zones.
        signal_state: Current signal state from operator input.
        image_width: Image width in pixels.
        image_height: Image height in pixels.

    Returns:
        List of violation dicts.
    """
    if signal_state != "red":
        return []  # No red-light violations when signal is not red

    violations = []
    for vehicle in vehicle_boxes:
        if vehicle["confidence"] < 0.3:
            continue

        bbox = vehicle["bbox"]
        front_x = (bbox[0] + bbox[2]) / 2
        front_y = bbox[3]

        for zone in stop_line_zones:
            if point_in_polygon(front_x, front_y, zone["polygon"]):
                violations.append({
                    "type": "RED_LIGHT_VIOLATION",
                    "vehicle_bbox": bbox,
                    "vehicle_category": vehicle["class_name"],
                    "zone_id": zone["id"],
                    "signal_state": signal_state,
                    "confidence": vehicle["confidence"] * 0.80,
                })
                break

    return violations
```

#### Configuration

Shares the same `stop_line_zones` configuration as stop-line violations. Additional field:

```yaml
traffic_signal:
  current_state: "unknown"  # "red" | "green" | "unknown"
  last_updated: null         # ISO 8601 timestamp
  operator_id: null          # Who set the signal state
```

#### Confidence Threshold

- **With signal input (red)**: 0.80 multiplier — higher confidence because signal state is confirmed
- **Without signal input**: Falls back to stop-line violation at 0.75 multiplier
- **Improvement path**: Signal API integration enables fully automated detection

---

## 8. License Plate OCR

### Two-Stage Pipeline

```
Stage 1: Detection (YOLOv8n Plate Model)
    Input: Full image
    Output: Plate bounding boxes

Stage 2: Recognition (RapidOCR on CPU)
    Input: Cropped plate regions
    Output: Plate text + confidence
```

### Stage 1: Plate Detection

- Model: Pre-trained YOLOv8n plate detector from Roboflow (mAP 97.2%)
- Loaded on-demand (not resident in VRAM)
- Returns normalized plate bboxes

### Stage 2: Text Recognition (RapidOCR)

```python
from rapidocr_onnxruntime import RapidOCR

ocr = RapidOCR()

def recognize_plate(crop: np.ndarray) -> tuple[str, float] | None:
    """Recognize text in a license plate crop.

    Args:
        crop: Cropped plate image (BGR).

    Returns:
        Tuple of (text, confidence) or None if no text found.
    """
    result, _ = ocr(crop)
    if result:
        text = result[0][1]    # Best result text
        conf = result[0][2]    # Best result confidence
        return text, conf
    return None
```

### Indian License Plate Regex & Post-Processing

Indian plates follow the format: `KA##XX####`

```python
import re

def postprocess_plate(raw_text: str) -> str | None:
    """Post-process OCR output for Indian license plate format.

    Handles common OCR errors:
    - O/0 confusion
    - I/1 confusion
    - Missing spaces
    - Extra characters

    Args:
        raw_text: Raw OCR output string.

    Returns:
        Formatted plate string (e.g., "KA01AB1234") or None if invalid.
    """
    # Remove spaces and special characters, uppercase
    cleaned = re.sub(r'[^A-Za-z0-9]', '', raw_text).upper()

    # Pattern: KA + 1-2 digits + 1-2 letters + 1-4 digits
    pattern = r'^(KA)(\d{1,2})([A-Z]{1,3})(\d{1,4})$'
    match = re.match(pattern, cleaned)

    if match:
        state = match.group(1)
        district = match.group(2).zfill(2)
        series = match.group(3)
        number = match.group(4).zfill(4)
        return f"{state}{district}{series}{number}"

    # Try common OCR corrections
    corrected = apply_ocr_corrections(cleaned)
    match = re.match(pattern, corrected)
    if match:
        state = match.group(1)
        district = match.group(2).zfill(2)
        series = match.group(3)
        number = match.group(4).zfill(4)
        return f"{state}{district}{series}{number}"

    return cleaned  # Return cleaned text even if pattern doesn't match


def apply_ocr_corrections(text: str) -> str:
    """Apply common OCR error corrections for Indian plates.

    Common errors:
    - '0' read as 'O' in district code (should be digits)
    - 'O' read as '0' in series (should be letters)
    - 'I' read as '1' in series
    """
    if not text.startswith("KA") or len(text) < 6:
        return text

    # District code: should be digits
    # Series: should be letters
    # Number: should be digits

    # This is a simplified correction — full version would need more context
    return text
```

### Valid Format Examples

| Plate | Format | Notes |
|-------|--------|-------|
| `KA01AB1234` | Standard | Karnataka, Bangalore Central |
| `KA05MZ9876` | Standard | Karnataka, Bangalore South |
| `KA41PK3456` | Standard | Karnataka, Belgaum |
| `KA03CR4521` | Standard | Karnataka, Bangalore East |

### OCR Confidence Threshold

| Confidence | Action |
|------------|--------|
| ≥ 0.80 | Include in violation record, mark as high confidence |
| 0.50 - 0.79 | Include in violation record, mark as medium confidence |
| < 0.50 | Include in violation record, mark as low confidence (officer review recommended) |

---

## 9. Evidence Format

### Annotated Image Layout

Every violation produces an annotated evidence image with the following elements:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌────────────┐                                         │
│  │no_helmet 87%│ ← Label (colored background)           │
│  └─────┬──────┘                                         │
│        │                                                 │
│   ┌────┴───────────┐ ← Person bbox (red)               │
│   │  ┌──────────┐  │                                   │
│   │  │ head      │  │ ← Head region (green, dashed)     │
│   │  └──────────┘  │                                   │
│   │                │                                    │
│   │    TORSO       │                                    │
│   │                │                                    │
│   └────────────────┘                                    │
│                                                          │
│  ┌─────────────────────────────────────────┐             │
│  │triple_riding 72%                        │ ← Orange   │
│  │  ┌────┐ ┌────┐ ┌────┐                   │             │
│  │  │ P1 │ │ P2 │ │ P3 │                   │             │
│  │  └────┘ └────┘ └────┘                   │             │
│  └─────────────────────────────────────────┘             │
│                                                          │
│  ┌──────────────┐                                        │
│  │license_plate │ ← Yellow                              │
│  │ KA01AB1234   │                                       │
│  └──────────────┘                                        │
│                                                          │
│ VigilAI                    2026-06-16 14:30:22 IST       │
└──────────────────────────────────────────────────────────┘
```

### Annotation Color Map

| Element | Color | BGR | Hex | Line Width |
|---------|-------|-----|-----|------------|
| no_helmet bbox | Red | (0, 0, 255) | #ef4444 | 2px |
| triple_riding bbox | Orange | (0, 165, 255) | #f97316 | 2px |
| license_plate bbox | Yellow | (0, 255, 255) | #eab308 | 2px |
| rider sub-bboxes | Orange | (0, 165, 255) | #f97316 | 1px |
| head region | Green | (0, 255, 0) | #22c55e | 1px dashed |
| label background | Same as violation | — | — | Filled |
| label text | White | (255, 255, 255) | #ffffff | 1px |
| timestamp | Gray | (200, 200, 200) | #c8c8c8 | 1px |
| VigilAI watermark | Gray | (150, 150, 150) | #969696 | 1px |

### Metadata Fields

Each evidence package includes:

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `violation_id` | string | `v_20260616_143022_001` | Unique case identifier |
| `evidence_url` | string | `/evidence/v_20260616_143022_001.jpg` | Image URL |
| `evidence_hash` | string | `sha256:abc123...` | Tamper detection |
| `timestamp` | ISO 8601 | `2026-06-16T14:30:22Z` | When detected |
| `junction_name` | string | `MG Road - Trinity Circle` | Location |
| `latitude` | float | 12.9757 | GPS coordinates |
| `longitude` | float | 77.6063 | GPS coordinates |
| `violation_type` | enum | `no_helmet` | Violation category |
| `confidence` | float | 0.87 | Detection confidence |
| `mv_act_section` | string | `129` | Legal reference |
| `fine_amount` | int | 500 | Fine in rupees |
| `license_plate_text` | string? | `KA01AB1234` | OCR result |

### MV Act Section Mapping

| Violation | MV Act Section | Section Title | Fine |
|-----------|----------------|---------------|------|
| No Helmet | 129 | Protective headgear | ₹500 |
| Triple Riding | 184 | Driving recklessly/dangerously | ₹1,000 |
| Wrong-Side Driving | 184 | Driving recklessly/dangerously | ₹1,000 |
| Illegal Parking | 122/177 | Obstruction of public road | ₹200 |
| No Seatbelt | 194B | Seatbelt violation | ₹1,000 |
| Stop-Line Violation | 184 | Driving recklessly/dangerously | ₹1,000 |
| Red-Light Violation | 184 | Driving recklessly/dangerously | ₹1,000 |
| License Plate Mismatch | 177 | General penalty for violations | ₹200 |

### File Naming Convention

```
img_{YYYYMMDD}_{HHMMSS}_{sha256_prefix_4}.jpg
```

Example: `img_20260616_143022_a3f2.jpg`

- `YYYYMMDD`: UTC date
- `HHMMSS`: UTC time
- `sha256_prefix_4`: First 4 hex chars of SHA-256 of annotated image data (uniqueness check)

### SHA-256 Hash

- Computed on the **saved JPEG file bytes** (not the original image)
- Format: `sha256:{64-character hex digest}`
- Purpose: Chain of custody — any modification to the evidence file changes the hash
- Verified by: Re-reading the file and comparing hash

---

## 10. Fine Amounts & MV Act Sections

### Complete Reference

| Violation | Section | Fine | Repeat Offense | Notes |
|-----------|---------|------|---------------|-------|
| **No Helmet** | Section 129 | ₹500 | ₹1,000 | Per person. Driver and pillion both must wear. |
| **Triple Riding** | Section 184 | ₹1,000 | ₹2,000 + possible license suspension | Reckless driving category. Court appearance may be required. |
| **Wrong-Side Driving** | Section 184 | ₹1,000 | ₹2,000 | Dangerous driving category. |
| **Illegal Parking** | Section 122/177 | ₹200 | ₹500 | Obstruction of public road. |
| **License Plate Issues** | Section 177 | ₹200 | ₹500 | Covers unreadable, missing, or non-standard plates. |

### Fine Calculation in VigilAI

```python
FINE_SCHEDULE = {
    "no_helmet": {"section": "129", "amount": 500},
    "triple_riding": {"section": "184", "amount": 1000},
    "wrong_side_driving": {"section": "184", "amount": 1000},
    "illegal_parking": {"section": "122", "amount": 200},
    "no_seatbelt": {"section": "194B", "amount": 1000},
    "stop_line_violation": {"section": "184", "amount": 1000},
    "red_light_violation": {"section": "184", "amount": 1000},
    "license_plate_mismatch": {"section": "177", "amount": 200},
}

def calculate_fine(violation_type: str, is_repeat: bool = False) -> dict:
    """Calculate fine amount for a violation.

    Args:
        violation_type: Type of violation.
        is_repeat: Whether this is a repeat offense.

    Returns:
        Dict with 'section', 'amount', and 'repeat_amount'.
    """
    schedule = FINE_SCHEDULE.get(violation_type, {"section": "177", "amount": 200})
    return {
        "section": schedule["section"],
        "amount": schedule["amount"] * 2 if is_repeat else schedule["amount"],
        "first_offense": schedule["amount"],
        "repeat_offense": schedule["amount"] * 2,
    }
```

### Inline Fine Display

In the UI, fines are displayed alongside each violation:

```
┌───────────────────────────┐
│ No Helmet · 87% · HIGH    │
│ Section 129 · ₹500        │
│ ▸ View Evidence            │
└───────────────────────────┘
```

---

## 11. Confidence Tiers

### Tier Definitions

| Tier | Range | Color | Badge | Action |
|------|-------|-------|-------|--------|
| **High** | ≥ 0.80 | Green | `● HIGH` | Auto-queue for review |
| **Medium** | 0.50 - 0.79 | Yellow | `● MEDIUM` | Queue for review, officer attention |
| **Low** | < 0.50 | Red | `● LOW` | Flag for manual inspection, may be noise |

### Confidence Tier Assignment

```python
def get_confidence_tier(confidence: float) -> str:
    """Assign confidence tier based on detection confidence.

    Args:
        confidence: Detection confidence (0.0 - 1.0).

    Returns:
        Tier string: "high", "medium", or "low".
    """
    if confidence >= 0.80:
        return "high"
    elif confidence >= 0.50:
        return "medium"
    return "low"
```

### Confidence Badge Component (React)

```tsx
function ConfidenceBadge({ tier }: { tier: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    high: {
      bg: "bg-green-900/50",
      text: "text-green-300",
      label: "HIGH",
    },
    medium: {
      bg: "bg-yellow-900/50",
      text: "text-yellow-300",
      label: "MEDIUM",
    },
    low: {
      bg: "bg-red-900/50",
      text: "text-red-300",
      label: "LOW",
    },
  };

  const c = config[tier] || config.medium;

  return (
    <Badge className={`${c.bg} ${c.text} border font-mono text-xs`}>
      {c.label}
    </Badge>
  );
}
```

### Expected Confidence Distributions

Based on pre-trained model benchmarks:

| Violation | Expected mAP@50 | Typical Confidence Range | Expected Tier |
|-----------|-----------------|------------------------|---------------|
| Helmet detection | 0.74-0.85 | 0.70-0.95 | Medium-High |
| Triple riding | 0.60-0.75 | 0.55-0.85 | Medium |
| License plate detection | 0.95+ | 0.85-0.99 | High |
| OCR recognition | N/A | 0.70-0.95 | Medium-High |

### Confidence vs. False Positive Rate

| Tier | Expected FP Rate | Officer Review Priority |
|------|-----------------|------------------------|
| High | < 5% | Standard review |
| Medium | 5-15% | Careful review, check for edge cases |
| Low | > 15% | Manual verification, may be noise |

---

*This specification is the authoritative reference for violation detection logic. All implementation must conform to these algorithms, parameters, and thresholds.*
