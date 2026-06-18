"""Seed the VigilAI database with realistic demo violations at Bengaluru junctions.

Inserts 200-300 violations at 10 real Bengaluru traffic junctions with weighted
distribution across violation types, time-of-day patterns, and realistic
license plates in Karnataka (KA) format.

Usage:
    python scripts/seed_bengaluru_demo.py
"""

import logging
import random
import string
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Ensure project root is on sys.path so imports work when run standalone
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from sqlalchemy import delete

from backend.app.db.database import SessionLocal, engine, Base
from backend.app.db.models import (
    AuditLogDB,
    ConfidenceTierDB,
    DataSourceDB,
    ViolationRecordDB,
    ViolationStatusDB,
    ViolationTypeDB,
    FINE_SCHEDULE,
    get_confidence_tier,
)
from backend.app.core.violations import compute_danger_score, generate_ai_explanation

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
RANDOM_SEED: int = 42
TOTAL_VIOLATIONS_MIN: int = 200
TOTAL_VIOLATIONS_MAX: int = 300
LOOKBACK_DAYS: int = 7
LICENSE_PLATE_PROBABILITY: float = 0.40  # fraction of violations that get a plate

# Junction definitions — 10 real Bengaluru traffic junctions
JUNCTIONS: list[dict[str, Any]] = [
    {"name": "MG Road - Trinity Circle", "lat": 12.9758, "lng": 77.6045, "camera_id": "MGROAD-01", "weight": 1.4},
    {"name": "Silk Board Junction", "lat": 12.9177, "lng": 77.6238, "camera_id": "SILKBOARD-01", "weight": 1.8},
    {"name": "Hebbal Flyover", "lat": 13.0358, "lng": 77.5970, "camera_id": "HEBBAL-01", "weight": 1.2},
    {"name": "Whitefield Main Road", "lat": 12.9698, "lng": 77.7500, "camera_id": "WHITEFIELD-01", "weight": 1.3},
    {"name": "Electronic City Phase 1", "lat": 12.8456, "lng": 77.6603, "camera_id": "ECITY-01", "weight": 1.5},
    {"name": "Marathahalli Bridge", "lat": 12.9591, "lng": 77.6974, "camera_id": "MARATHA-01", "weight": 1.3},
    {"name": "KR Puram Railway Junction", "lat": 12.9970, "lng": 77.6844, "camera_id": "KRPURAM-01", "weight": 1.1},
    {"name": "Yelahanka New Town", "lat": 13.1007, "lng": 77.5963, "camera_id": "YELAHANKA-01", "weight": 1.0},
    {"name": "Bannerghatta Road - Jayadeva", "lat": 12.9135, "lng": 77.5985, "camera_id": "BANNER-01", "weight": 1.2},
    {"name": "Koramangala 100ft Road", "lat": 12.9352, "lng": 77.6245, "camera_id": "KORAMANGLA-01", "weight": 1.2},
]

# Violation type distribution — weights that sum to ~1.0
VIOLATION_WEIGHTS: dict[str, float] = {
    "no_helmet": 0.45,
    "triple_riding": 0.20,
    "wrong_side_driving": 0.15,
    "illegal_parking": 0.10,
    "no_seatbelt": 0.04,
    "stop_line_violation": 0.02,
    "red_light_violation": 0.02,
    "license_plate_mismatch": 0.02,
}

# Time-of-day violation rates (hour -> relative weight)
HOUR_WEIGHTS: dict[int, float] = {
    0: 0.2, 1: 0.15, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.15,
    6: 0.8, 7: 1.0, 8: 1.0, 9: 0.6,
    10: 0.6, 11: 0.6, 12: 0.4, 13: 0.4, 14: 0.5,
    15: 0.5, 16: 0.6, 17: 0.9, 18: 1.0, 19: 1.0, 20: 0.8,
    21: 0.5, 22: 0.3, 23: 0.25,
}

# Status distribution
STATUS_WEIGHTS: dict[str, float] = {
    "pending": 0.80,
    "approved": 0.15,
    "rejected": 0.05,
}

# Karnataka RTO codes for license plates
KA_RTO_CODES: list[str] = [
    "KA01", "KA02", "KA03", "KA04", "KA05",
    "KA51", "KA52", "KA53", "KA54", "KA55",
]

# Indian uppercase letters (excluding I, O to avoid confusion with 1, 0)
PLATE_LETTERS: str = "ABCDEFGHJKLMNPQRSTUVWXYZ"


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _generate_license_plate(rng: random.Random) -> str:
    """Generate a realistic Karnataka license plate in KA##XX#### format.

    Args:
        rng: Seeded random number generator.

    Returns:
        License plate string like 'KA01AB1234'.
    """
    rto = rng.choice(KA_RTO_CODES)
    letters = "".join(rng.choices(PLATE_LETTERS, k=2))
    digits = "".join(rng.choices(string.digits, k=4))
    return f"{rto}{letters}{digits}"


def _sample_hour(rng: random.Random) -> int:
    """Sample an hour-of-day weighted by typical violation frequency.

    Morning rush (06-09) and evening rush (17-21) produce more violations.

    Args:
        rng: Seeded random number generator.

    Returns:
        Hour integer in [0, 23].
    """
    hours = list(HOUR_WEIGHTS.keys())
    weights = list(HOUR_WEIGHTS.values())
    return rng.choices(hours, weights=weights, k=1)[0]


def _sample_violation_type(rng: random.Random) -> str:
    """Sample a violation type according to the configured distribution.

    Args:
        rng: Seeded random number generator.

    Returns:
        Violation type string (e.g. 'no_helmet').
    """
    types = list(VIOLATION_WEIGHTS.keys())
    weights = list(VIOLATION_WEIGHTS.values())
    return rng.choices(types, weights=weights, k=1)[0]


def _sample_junction(rng: random.Random) -> dict[str, Any]:
    """Sample a junction weighted by traffic volume.

    Args:
        rng: Seeded random number generator.

    Returns:
        Junction dict with name, lat, lng, camera_id.
    """
    weights = [j["weight"] for j in JUNCTIONS]
    return rng.choices(JUNCTIONS, weights=weights, k=1)[0]


def _sample_status(rng: random.Random) -> str:
    """Sample violation review status per distribution.

    Args:
        rng: Seeded random generator.

    Returns:
        Status string: 'pending', 'approved', or 'rejected'.
    """
    statuses = list(STATUS_WEIGHTS.keys())
    weights = list(STATUS_WEIGHTS.values())
    return rng.choices(statuses, weights=weights, k=1)[0]


def _make_bbox(rng: random.Random) -> dict[str, float]:
    """Generate a random normalised bounding box.

    Args:
        rng: Seeded random number generator.

    Returns:
        Dict with x1, y1, x2, y2 as floats in [0, 1].
    """
    x1 = rng.uniform(0.05, 0.7)
    y1 = rng.uniform(0.05, 0.7)
    w = rng.uniform(0.10, 0.25)
    h = rng.uniform(0.10, 0.30)
    x2 = min(x1 + w, 0.95)
    y2 = min(y1 + h, 0.95)
    return {"x1": round(x1, 4), "y1": round(y1, 4), "x2": round(x2, 4), "y2": round(y2, 4)}


def _make_person_bbox(rng: random.Random) -> dict[str, float]:
    """Generate a random person bounding box (slightly taller than wide).

    Args:
        rng: Seeded random number generator.

    Returns:
        Dict with x1, y1, x2, y2 as floats in [0, 1].
    """
    x1 = rng.uniform(0.1, 0.6)
    y1 = rng.uniform(0.05, 0.5)
    w = rng.uniform(0.08, 0.18)
    h = rng.uniform(0.20, 0.50)
    x2 = min(x1 + w, 0.95)
    y2 = min(y1 + h, 0.95)
    return {"x1": round(x1, 4), "y1": round(y1, 4), "x2": round(x2, 4), "y2": round(y2, 4)}


def _make_confidence(rng: random.Random) -> float:
    """Generate a confidence score with realistic distribution.

    Most detections should be high-confidence, with a long tail of lower scores.

    Args:
        rng: Seeded random number generator.

    Returns:
        Float in [0.35, 0.99].
    """
    # Beta distribution skewed toward higher values
    raw = rng.betavariate(5, 2)  # mean ≈ 0.71
    return round(max(0.35, min(raw, 0.99)), 4)


def _generate_violation_id(dt: datetime, seq: int) -> str:
    """Generate a violation ID in v_YYYYMMDD_HHMMSS_NNN format.

    Args:
        dt: Timestamp for the violation.
        seq: Sequence number to ensure uniqueness.

    Returns:
        Formatted ID string.
    """
    return f"v_{dt.strftime('%Y%m%d_%H%M%S')}_{seq:03d}"


def _build_metadata(violation_type: str, rng: random.Random) -> dict[str, Any]:
    """Build the violation_metadata JSON field.

    Args:
        violation_type: The violation type string.
        rng: Seeded random number generator.

    Returns:
        Metadata dict with violation-specific details.
    """
    meta: dict[str, Any] = {"detection_method": "yolov8"}

    if violation_type == "no_helmet":
        meta["head_region_iou"] = round(rng.uniform(0.1, 0.6), 3)
        meta["helmet_detection_score"] = round(rng.uniform(0.7, 0.95), 3)
    elif violation_type == "triple_riding":
        meta["rider_count"] = 3
        meta["vehicle_type"] = rng.choice(["motorcycle", "scooter"])
    elif violation_type == "wrong_side_driving":
        meta["lane_position"] = rng.choice(["oncoming", "opposite_shoulder"])
    elif violation_type == "illegal_parking":
        meta["parking_duration_sec"] = rng.randint(60, 1800)
        meta["zone_type"] = "no_parking"
    elif violation_type == "no_seatbelt":
        meta["windshield_crop_confidence"] = round(rng.uniform(0.6, 0.9), 3)
    elif violation_type == "stop_line_violation":
        meta["stop_line_distance_px"] = rng.randint(10, 200)
    elif violation_type == "red_light_violation":
        meta["signal_state"] = "red"
        meta["stop_line_crossed"] = True
    elif violation_type == "license_plate_mismatch":
        meta["expected_state"] = "KA"
        meta["read_state"] = rng.choice(["MH", "TN", "AP", "TS"])

    return meta


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------

def generate_violations(total: int | None = None) -> list[dict[str, Any]]:
    """Generate a list of violation dicts ready for DB insertion.

    Args:
        total: Exact number of violations to generate. If None, a random
               count between TOTAL_VIOLATIONS_MIN and TOTAL_VIOLATIONS_MAX
               is chosen.

    Returns:
        List of dicts matching ViolationRecordDB columns.
    """
    rng = random.Random(RANDOM_SEED)

    if total is None:
        total = rng.randint(TOTAL_VIOLATIONS_MIN, TOTAL_VIOLATIONS_MAX)
    logger.info("Generating %d violations …", total)

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=LOOKBACK_DAYS)

    violations: list[dict[str, Any]] = []
    id_seq = 0

    for _ in range(total):
        id_seq += 1

        # --- random timestamp within the lookback window ---
        day_offset = rng.randint(0, LOOKBACK_DAYS - 1)
        hour = _sample_hour(rng)
        minute = rng.randint(0, 59)
        second = rng.randint(0, 59)
        ts = (start + timedelta(days=day_offset)).replace(
            hour=hour, minute=minute, second=second, microsecond=0
        )

        # --- violation type & fine schedule ---
        vtype = _sample_violation_type(rng)
        fine_info = FINE_SCHEDULE[vtype]

        # --- junction ---
        junction = _sample_junction(rng)

        # --- confidence & tier ---
        confidence = _make_confidence(rng)
        tier = get_confidence_tier(confidence)

        # --- bounding boxes ---
        bbox = _make_bbox(rng)
        person_bbox: dict[str, float] | None = None
        if vtype in ("no_helmet", "triple_riding", "no_seatbelt"):
            person_bbox = _make_person_bbox(rng)

        # --- license plate (only ~40% of violations) ---
        plate_text: str | None = None
        plate_conf: float | None = None
        plate_bbox: dict[str, float] | None = None
        if rng.random() < LICENSE_PLATE_PROBABILITY:
            plate_text = _generate_license_plate(rng)
            plate_conf = round(rng.uniform(0.70, 0.99), 4)
            plate_bbox = {
                "x1": round(rng.uniform(0.2, 0.6), 4),
                "y1": round(rng.uniform(0.6, 0.85), 4),
                "x2": round(rng.uniform(0.6, 0.9), 4),
                "y2": round(rng.uniform(0.8, 0.95), 4),
            }

        # --- status ---
        status = _sample_status(rng)

        # --- danger score & AI explanation ---
        compound_factor = 1.0  # single violation per detection in seed data
        danger_score = compute_danger_score(
            violation_type=vtype,
            confidence=confidence,
            fine_amount=int(fine_info["amount"]),
            compound_factor=compound_factor,
        )
        ai_explanation = generate_ai_explanation(
            violation_type=vtype,
            confidence=confidence,
            bbox=[bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]],
            metadata=_build_metadata(vtype, rng),
        )

        # --- record ---
        record_id = _generate_violation_id(ts, id_seq)
        violations.append({
            "id": record_id,
            "violation_type": vtype,
            "confidence": confidence,
            "confidence_tier": tier,
            "bbox": bbox,
            "person_bbox": person_bbox,
            "violation_metadata": _build_metadata(vtype, rng),
            "mv_act_section": fine_info["section"],
            "fine_amount": fine_info["amount"],
            "license_plate_text": plate_text,
            "license_plate_confidence": plate_conf,
            "license_plate_bbox": plate_bbox,
            "status": status,
            "data_source": "seeded",
            "camera_id": junction["camera_id"],
            "junction_name": junction["name"],
            "latitude": junction["lat"],
            "longitude": junction["lng"],
            "timestamp": ts,
            "evidence_url": None,
            "evidence_hash": None,
            "danger_score": danger_score,
            "ai_explanation": ai_explanation,
            "is_duplicate": 0,
            "duplicate_group_id": None,
            "created_at": now,
            "updated_at": now,
        })

    logger.info("Generated %d violation records.", len(violations))

    # --- Generate ~10 duplicate violations for dedup demo ---
    # These are near-duplicates (same camera, same type, within 5 min of an
    # existing violation) that the detection pipeline would mark as duplicates.
    dup_count = 0
    for v in violations[:50]:  # sample from the first 50
        if dup_count >= 10:
            break
        if rng.random() > 0.25:
            continue  # ~25% chance of creating a duplicate

        id_seq += 1
        dup_ts = v["timestamp"] + timedelta(seconds=rng.randint(30, 240))
        dup_vtype = v["violation_type"]
        dup_fine = FINE_SCHEDULE[dup_vtype]
        dup_conf = round(min(v["confidence"] + rng.uniform(-0.05, 0.05), 0.99), 4)
        dup_tier = get_confidence_tier(dup_conf)
        dup_group = f"DUP-{v['camera_id']}-{v['timestamp'].strftime('%Y%m%d')}"
        dup_bbox = _make_bbox(rng)
        dup_meta = _build_metadata(dup_vtype, rng)

        dup_danger = compute_danger_score(
            violation_type=dup_vtype,
            confidence=dup_conf,
            fine_amount=int(dup_fine["amount"]),
            compound_factor=1.0,
        )
        dup_explanation = generate_ai_explanation(
            violation_type=dup_vtype,
            confidence=dup_conf,
            bbox=[dup_bbox["x1"], dup_bbox["y1"], dup_bbox["x2"], dup_bbox["y2"]],
            metadata=dup_meta,
        )

        violations.append({
            "id": _generate_violation_id(dup_ts, id_seq),
            "violation_type": dup_vtype,
            "confidence": dup_conf,
            "confidence_tier": dup_tier,
            "bbox": dup_bbox,
            "person_bbox": None,
            "violation_metadata": dup_meta,
            "mv_act_section": dup_fine["section"],
            "fine_amount": int(dup_fine["amount"]),
            "license_plate_text": v["license_plate_text"],
            "license_plate_confidence": v["license_plate_confidence"],
            "license_plate_bbox": v["license_plate_bbox"],
            "status": "pending",
            "data_source": "seeded",
            "camera_id": v["camera_id"],
            "junction_name": v["junction_name"],
            "latitude": v["latitude"],
            "longitude": v["longitude"],
            "timestamp": dup_ts,
            "evidence_url": None,
            "evidence_hash": None,
            "danger_score": dup_danger,
            "ai_explanation": dup_explanation,
            "is_duplicate": 1,
            "duplicate_group_id": dup_group,
            "created_at": now,
            "updated_at": now,
        })
        dup_count += 1

    logger.info(
        "Generated %d violation records (incl. %d duplicates).",
        len(violations),
        dup_count,
    )
    return violations


def seed_database(violations: list[dict[str, Any]]) -> None:
    """Clear existing seeded data and insert fresh violations.

    Args:
        violations: List of violation dicts from generate_violations().
    """
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        # Delete previously seeded violations
        count_before = session.query(ViolationRecordDB).filter(
            ViolationRecordDB.data_source == DataSourceDB.SEEDED
        ).count()
        session.execute(
            delete(ViolationRecordDB).where(
                ViolationRecordDB.data_source == DataSourceDB.SEEDED
            )
        )
        session.commit()
        logger.info("Cleared %d existing seeded violations.", count_before)

        # Also clear seeded audit logs
        session.execute(
            delete(AuditLogDB).where(
                AuditLogDB.actor == "seed_script"
            )
        )
        session.commit()

        # Bulk insert
        objects = []
        for v in violations:
            obj = ViolationRecordDB(
                id=v["id"],
                violation_type=ViolationTypeDB(v["violation_type"]),
                confidence=v["confidence"],
                confidence_tier=ConfidenceTierDB(v["confidence_tier"]),
                bbox=v["bbox"],
                person_bbox=v["person_bbox"],
                violation_metadata=v["violation_metadata"],
                mv_act_section=v["mv_act_section"],
                fine_amount=v["fine_amount"],
                license_plate_text=v["license_plate_text"],
                license_plate_confidence=v["license_plate_confidence"],
                license_plate_bbox=v["license_plate_bbox"],
                status=ViolationStatusDB(v["status"]),
                data_source=DataSourceDB(v["data_source"]),
                camera_id=v["camera_id"],
                junction_name=v["junction_name"],
                latitude=v["latitude"],
                longitude=v["longitude"],
                timestamp=v["timestamp"],
                evidence_url=v["evidence_url"],
                evidence_hash=v["evidence_hash"],
                danger_score=v["danger_score"],
                ai_explanation=v["ai_explanation"],
                is_duplicate=v["is_duplicate"],
                duplicate_group_id=v["duplicate_group_id"],
                created_at=v["created_at"],
                updated_at=v["updated_at"],
            )
            objects.append(obj)

        session.add_all(objects)
        session.commit()
        logger.info("Inserted %d violations into database.", len(objects))

        # Create audit logs for approved/rejected violations
        audit_count = 0
        for v in violations:
            if v["status"] in ("approved", "rejected"):
                log = AuditLogDB(
                    violation_id=v["id"],
                    action=v["status"],
                    actor="seed_script",
                    detail={"reason": f"Seeded as {v['status']} for demo"},
                    timestamp=v["created_at"],
                )
                session.add(log)
                audit_count += 1

        session.commit()
        logger.info("Created %d audit log entries.", audit_count)

    finally:
        session.close()


def print_summary(violations: list[dict[str, Any]]) -> None:
    """Print a summary table of the seeded data.

    Args:
        violations: The list of violation dicts that were seeded.
    """
    total = len(violations)

    # Count by type
    by_type: dict[str, int] = {}
    for v in violations:
        by_type[v["violation_type"]] = by_type.get(v["violation_type"], 0) + 1

    # Count by junction
    by_junction: dict[str, int] = {}
    for v in violations:
        by_junction[v["junction_name"]] = by_junction.get(v["junction_name"], 0) + 1

    # Count by status
    by_status: dict[str, int] = {}
    for v in violations:
        by_status[v["status"]] = by_status.get(v["status"], 0) + 1

    # Count by tier
    by_tier: dict[str, int] = {}
    for v in violations:
        by_tier[v["confidence_tier"]] = by_tier.get(v["confidence_tier"], 0) + 1

    # Plates
    plates = sum(1 for v in violations if v["license_plate_text"] is not None)

    # Duplicates
    dups = sum(1 for v in violations if v["is_duplicate"] == 1)

    # Danger score stats
    danger_scores = [v["danger_score"] for v in violations]
    avg_danger = sum(danger_scores) / len(danger_scores) if danger_scores else 0

    logger.info("=" * 60)
    logger.info("SEED COMPLETE — SUMMARY")
    logger.info("=" * 60)
    logger.info("Total violations: %d", total)
    logger.info("")
    logger.info("By violation type:")
    for vtype, count in sorted(by_type.items(), key=lambda x: -x[1]):
        pct = count / total * 100
        logger.info("  %-30s %4d  (%5.1f%%)", vtype, count, pct)
    logger.info("")
    logger.info("By junction:")
    for jname, count in sorted(by_junction.items(), key=lambda x: -x[1]):
        pct = count / total * 100
        logger.info("  %-35s %4d  (%5.1f%%)", jname, count, pct)
    logger.info("")
    logger.info("By status:")
    for st, count in sorted(by_status.items()):
        logger.info("  %-12s %4d  (%5.1f%%)", st, count, count / total * 100)
    logger.info("")
    logger.info("By confidence tier:")
    for tier, count in sorted(by_tier.items()):
        logger.info("  %-12s %4d  (%5.1f%%)", tier, count, count / total * 100)
    logger.info("")
    logger.info("License plates generated: %d / %d (%.1f%%)", plates, total, plates / total * 100)
    logger.info("Duplicates: %d / %d (%.1f%%)", dups, total, dups / total * 100)
    logger.info("Avg danger score: %.1f (range %d-%d)", avg_danger, min(danger_scores), max(danger_scores))
    logger.info("=" * 60)


def main() -> None:
    """Entry point — generate violations, seed DB, print summary."""
    logger.info("Starting Bengaluru demo seed …")
    violations = generate_violations()
    seed_database(violations)
    print_summary(violations)
    logger.info("Done.")


if __name__ == "__main__":
    main()
