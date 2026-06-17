# Agent Rules — VigilAI (Flipkart GridLock 2.0, Round 2, Track 3)

> **Authority:** These rules override any agent defaults or user shortcuts. No exceptions.

---

## Critical Environment Rule

You **MUST** always use the Python interpreter at `D:\Web Project\Flipkart\Round 2\venv\Scripts\python.exe` when running Python scripts or commands. Do not use system Python, Round 1's venv, or any other interpreter.

## Git Authorship Rule

You **MUST NOT** add yourself as an author or co-author on any commit. This includes but is not limited to:

- `Co-authored-by:` trailers in commit messages
- `Ultraworked with` or similar attribution lines in commit messages
- Adding your name to the `author` field in `package.json` or any other config
- Any form of self-attribution in code, comments, or commit metadata

The only author is the human partner (Vedant Tong). No exceptions.

## Core Principles

| Principle | Rule |
|---|---|
| **Human Collaboration** | Consult the human partner at decision points — don't assume |
| **No Placeholders** | Every function must be complete and functional |
| **No Demo Code** | All code must be production-intent, not illustrative |
| **Modularity** | Keep files under 1500 lines; split logically when approaching limit |
| **Hardware Awareness** | 4GB VRAM (RTX 3050) — COCO+Helmet resident, plate on-demand, OCR on CPU |
| **Verification First** | Run code immediately after writing, verify outputs |
| **Documentation** | Document as you build, not after |
| **Production Quality** | Code must look human-written, professional, and hackathon-submittable |
| **Plan Compliance** | All work must reference `docs/plan.md`. Any deviation requires human consultation |

---

## Project Context

**VigilAI** is an AI-powered traffic violation detection system for Bengaluru Traffic Police. It processes traffic camera images to detect violations, read license plates, generate court-admissible evidence, and display results on a command center dashboard.

- **Hackathon**: Flipkart GridLock 2.0, Round 2, Track 3
- **Deadline**: June 21, 2026, 11:59 PM IST
- **Solo developer**, 2-day build
- **Master plan**: `docs/plan.md` — the single source of truth

---

## Mandatory Human Consultation

You **MUST** stop and ask the human before proceeding in ALL of the following situations. Do not guess. Do not assume. Do not proceed silently.

### Always Consult

1. **Model changes** — Switching YOLO variants, adding new models, changing helmet/plate detection approach
2. **Violation detection logic changes** — Modifying head-region association parameters, triple riding thresholds, adding new violation types
3. **New dependencies** — Adding any package not listed in `requirements.txt`
4. **VRAM issues** — If models don't fit in 4GB VRAM, or OOM errors occur
5. **Deviating from the plan** — Any change not documented in `docs/plan.md`
6. **Performance issues** — If detection accuracy is below expectations, OCR fails on Indian plates
7. **Integration failures** — If frontend-backend integration breaks, API contract mismatches
8. **File getting long** — If any file approaches 1000 lines, stop and discuss how to split
9. **Demo failures** — If the live demo doesn't work during testing
10. **Uncertainty** — If you are less than 90% confident in any implementation decision

### How to Consult

When consulting:
- State what you're unsure about in one sentence
- Propose 2–3 options with pros and cons
- Recommend one option and explain why
- Wait for a response before writing any code

---

## Code Standards

### No Placeholders — Zero Tolerance

```
# FORBIDDEN patterns — never write any of these:
pass                          # empty function body
raise NotImplementedError()   # stub
...                           # ellipsis as placeholder
# TODO: implement later       # deferred work
return None                   # placeholder return
print("not implemented")      # fake implementation
```

If you cannot implement something fully, **stop and ask** the human what to do. Do not leave skeleton code.

### Production Quality Code

Every line you write must look like it came from a professional CV engineer. This means:
- Error handling on all file I/O and model loading
- Input validation on all public functions
- Logging instead of print statements
- Type hints on all function signatures
- Docstrings on all public functions and classes (Google style)
- Constants in `configs/default.yaml`, not hardcoded
- No magic numbers — define named constants

### VRAM Constraints

The target machine has **4GB VRAM** (RTX 3050). Design for:
- COCO model + Helmet model: always resident (~1.5 GB with context)
- Plate model: on-demand load → infer → unload → gc.collect() → empty_cache()
- RapidOCR: CPU only (set OMP_NUM_THREADS=4, ONNX_NUM_THREADS=4)
- Pre-warm all models at FastAPI startup with dummy inference
- Verify ONNX Runtime has NO CUDA provider before running OCR

### Modularity

- **Hard limit:** No file exceeds 1500 lines
- **Soft limit:** Start discussing splits at 1000 lines
- Backend code in `backend/app/`
- Frontend code in `frontend/src/`
- Shared utilities in `backend/app/core/`
- Constants in `configs/default.yaml`, not hardcoded

---

## Project Structure

```
Round 2/
├── AGENTS.md
├── docs/
│   ├── plan.md              # Master plan (FINAL)
│   ├── phase-1-cv-pipeline.md
│   ├── phase-2-backend.md
│   ├── phase-3-frontend.md
│   ├── tech-stack.md
│   └── violations-spec.md
├── requirements.txt
├── .gitignore
├── configs/
│   └── default.yaml          # Model paths, thresholds, API settings, lane/zone polygons
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app + lifespan
│   │   ├── config.py           # Pydantic Settings
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── detect.py      # POST /api/v1/detect
│   │   │   ├── violations.py  # GET /api/v1/violations (CRUD + approve/reject)
│   │   │   ├── evidence.py    # GET /api/v1/evidence/{id}
│   │   │   └── analytics.py  # GET /api/v1/analytics
│   │   ├── core/
│   │   │   ├── preprocessing.py   # CLAHE, denoise, gamma
│   │   │   ├── detector.py        # YOLOv8 wrapper (COCO+Helmet resident, plate on-demand)
│   │   │   ├── violations.py      # Helmet, triple riding, wrong-side, illegal parking
│   │   │   ├── ocr.py             # RapidOCR + Indian plate regex
│   │   │   └── evidence.py        # Annotated image generation + SHA-256
│   │   └── db/
│   │       ├── database.py        # SQLite engine + session
│   │       └── models.py         # SQLAlchemy ORM models
│   └── weights/                  # Pre-trained model weights
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── pages/               # Dashboard, Upload, Violations, Evidence, Analytics
│   │   ├── components/          # Layout, ViolationCard, StatsBar, AnnotatedViewer, MapView
│   │   ├── lib/                 # API client
│   │   └── types/               # TypeScript types (must match Pydantic schemas)
│   └── public/
├── data/
│   ├── sample_images/           # Curated demo images
│   └── sample_videos/           # Test video clips
├── outputs/
│   └── evidence/                # Generated annotated evidence images
└── scripts/
    ├── setup_weights.py         # Download model weights
    └── seed_bengaluru_demo.py  # Seed 200-300 violations at real Bengaluru junctions
```

---

## Key API Contract

```
POST /api/v1/detect
  Request: multipart/form-data
    - image: File (JPEG/PNG, max 10MB)
    - camera_id: string (optional)

  Response 200:
    - success: bool
    - processing_time_ms: int
    - timing_breakdown: { preprocess_ms, detect_coco_ms, detect_helmet_ms, violation_logic_ms, detect_plate_ms, ocr_ms, evidence_gen_ms }
    - violations: ViolationRecord[]
    - image_dimensions: { width, height }
```

See `docs/plan.md` Section 6 for full contract.

---

## Violation Types

| Type | ViolationType Enum | MV Act Section | Fine | Approach |
|------|-------------------|----------------|------|----------|
| Helmet non-compliance | `no_helmet` | Section 129 | ₹500 | Primary — head-region spatial association |
| Triple riding | `triple_riding` | Section 184 | ₹1,000 | Primary — 2D spatial constraints |
| Wrong-side driving | `wrong_side_driving` | Section 184 | ₹1,000 | Heuristic — lane-position + polygons |
| Illegal parking | `illegal_parking` | Section 122 | ₹200 | Heuristic — zone-based polygon |
| Seatbelt non-compliance | `no_seatbelt` | Section 194B | ₹1,000 | Best-effort — windshield crop + classifier |
| Stop-line violation | `stop_line_violation` | Section 184 | ₹1,000 | Heuristic — vehicle past stop-line zone |
| Red-light violation | `red_light_violation` | Section 184 | ₹1,000 | Heuristic — stop-line zone + signal input |
| License plate mismatch | `license_plate_mismatch` | Section 177 | ₹200 | Primary — OCR + regex validation |

See `docs/violations-spec.md` for full algorithms.

---

## Workflow Rules

### Verification First

For every module you implement:

1. **After writing implementation:** Run the code immediately
2. **Before moving to next module:** Verify outputs are correct
3. **If a test fails:** Fix the code, don't fix the test (unless the test expectation is wrong — consult human if unsure)

### Documentation As You Build

Every function must have a docstring **at the time of writing**. Not "I'll add docs later." Format:

```python
def detect_helmet_violations(
    person_boxes: np.ndarray,
    helmet_boxes: np.ndarray,
    helmet_labels: np.ndarray,
    head_fraction: float = 0.30,
    iou_threshold: float = 0.3,
) -> list[dict]:
    """Detect helmet non-compliance using head-region spatial association.

    Args:
        person_boxes: (N, 4) xyxy person bounding boxes in pixel coords.
        helmet_boxes: (M, 4) xyxy helmet/no-helmet bounding boxes in pixel coords.
        helmet_labels: (M,) labels - "helmet" or "no_helmet".
        head_fraction: Fraction of person bbox height to use as head region.
        iou_threshold: Minimum IoU between head region and helmet box.

    Returns:
        List of violation dicts with type, bbox, confidence.

    Raises:
        ValueError: If bbox arrays have wrong shape.
    """
```

---

## Git Commit Rules

### When to Commit

Commit **every time** a change is bigger than small. If you're unsure whether it qualifies, it does. Examples:

- [Completed a new module]
- [Added or modified tests]
- [Changed violation detection logic or thresholds]
- [Added a new dependency]
- [Fixed a bug] that affected outputs
- [Refactored a file] into multiple files
- [Any change touching 1+ files]

### Commit Message Template

```
<type>(<scope>): <short summary>

Why:
- <problem being solved>

What:
- <change 1>
- <change 2>

Impact:
- <user/system impact>

Validation:
- <test/check 1>
```

#### Scope

Use the module name: `pipeline`, `backend`, `frontend`, `violations`, `ocr`, `evidence`, `dashboard`, `map`, `config`

Do not mention anything that would make it sound like the commits were made by an AI, create production quality PRs and merge them at appropriate intervals. Get rid of stale branches as soon as possible. Use separate branches for separate uses. Maintain production quality version control.

---

## Checklist Before Every Commit

Before considering any piece of work "done," verify:

- [ ] Code runs without errors
- [ ] No placeholder code anywhere
- [ ] All functions have docstrings
- [ ] All functions have type hints
- [ ] No `print()` statements (use `logging`)
- [ ] No hardcoded paths (use `configs/default.yaml`)
- [ ] File is under 1500 lines
- [ ] Human has been consulted on any non-trivial decision
- [ ] Change aligns with `docs/plan.md`

---

*If in doubt, ask. The human would rather answer a question than debug a bad assumption.*
