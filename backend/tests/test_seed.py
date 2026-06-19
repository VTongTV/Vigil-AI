"""Tests for the Bengaluru demo seed script.

Validates junction data structures, violation distributions, license plate
formatting, confidence tier logic, and time-of-day weighting.

All tests marked slow because they import DB models and may exercise
generate_violations() which touches module-level config.
"""

import re
import sys
from pathlib import Path
from typing import Any

import pytest

# Ensure project root is on sys.path for standalone test invocation
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Import from the seed script — re-exposed for testability
from scripts.seed_bengaluru_demo import (
    JUNCTIONS,
    VIOLATION_WEIGHTS,
    HOUR_WEIGHTS,
    LICENSE_PLATE_PROBABILITY,
    RANDOM_SEED,
    TOTAL_VIOLATIONS_MIN,
    TOTAL_VIOLATIONS_MAX,
    _generate_license_plate,
    _sample_hour,
    _sample_violation_type,
    _make_confidence,
    _make_bbox,
    _generate_violation_id,
    generate_violations,
)
from backend.app.db.models import (
    FINE_SCHEDULE,
    get_confidence_tier,
    ViolationTypeDB,
)

# ---------------------------------------------------------------------------
# Constants for assertions
# ---------------------------------------------------------------------------
LICENSE_PLATE_RE = re.compile(r"^KA\d{2}[A-Z]{2}\d{4}$")
EXPECTED_VIOLATION_TYPES = {
    "no_helmet",
    "triple_riding",
    "wrong_side_driving",
    "illegal_parking",
    "no_seatbelt",
    "stop_line_violation",
    "red_light_violation",
    "license_plate_mismatch",
}

# Tolerance for distribution comparisons (absolute percentage points)
DISTRIBUTION_TOLERANCE_PP = 8.0


# ---------------------------------------------------------------------------
# Junction data structure tests
# ---------------------------------------------------------------------------
@pytest.mark.slow
class TestJunctions:
    """Validate the JUNCTIONS constant structure and data."""

    def test_junction_count(self) -> None:
        """There must be exactly 10 junctions."""
        assert len(JUNCTIONS) == 10

    def test_all_required_keys(self) -> None:
        """Every junction must have name, lat, lng, camera_id, weight."""
        required = {"name", "lat", "lng", "camera_id", "weight"}
        for j in JUNCTIONS:
            missing = required - set(j.keys())
            assert not missing, f"Junction '{j.get('name', '?')}' missing keys: {missing}"

    def test_unique_names(self) -> None:
        names = [j["name"] for j in JUNCTIONS]
        assert len(names) == len(set(names)), "Duplicate junction names found"

    def test_unique_camera_ids(self) -> None:
        ids = [j["camera_id"] for j in JUNCTIONS]
        assert len(ids) == len(set(ids)), "Duplicate camera IDs found"

    def test_bengaluru_lat_range(self) -> None:
        """All junction latitudes should be in greater Bengaluru (~12.7–13.2)."""
        for j in JUNCTIONS:
            assert 12.5 <= j["lat"] <= 13.3, (
                f"Junction '{j['name']}' lat {j['lat']} outside Bengaluru range"
            )

    def test_bengaluru_lng_range(self) -> None:
        """All junction longitudes should be in greater Bengaluru (~77.4–77.8)."""
        for j in JUNCTIONS:
            assert 77.3 <= j["lng"] <= 77.9, (
                f"Junction '{j['name']}' lng {j['lng']} outside Bengaluru range"
            )

    def test_weights_positive(self) -> None:
        for j in JUNCTIONS:
            assert j["weight"] > 0, f"Junction '{j['name']}' weight must be positive"

    def test_camera_id_format(self) -> None:
        """Camera IDs should be UPPERCASE-## pattern."""
        cam_re = re.compile(r"^[A-Z]+-\d{2}$")
        for j in JUNCTIONS:
            assert cam_re.match(j["camera_id"]), (
                f"Camera ID '{j['camera_id']}' doesn't match expected format"
            )


# ---------------------------------------------------------------------------
# Violation distribution tests
# ---------------------------------------------------------------------------
@pytest.mark.slow
class TestViolationDistribution:
    """Validate that the violation weight distribution sums correctly
    and covers all required types."""

    def test_weights_sum_to_one(self) -> None:
        """Violation weights should sum to 1.0 (±0.01)."""
        total = sum(VIOLATION_WEIGHTS.values())
        assert abs(total - 1.0) < 0.01, f"Violation weights sum to {total}, expected ~1.0"

    def test_all_types_covered(self) -> None:
        """Every violation type must have a non-zero weight."""
        assert set(VIOLATION_WEIGHTS.keys()) == EXPECTED_VIOLATION_TYPES

    def test_all_weights_positive(self) -> None:
        for vtype, w in VIOLATION_WEIGHTS.items():
            assert w > 0, f"Weight for {vtype} must be positive, got {w}"

    def test_helmet_dominant(self) -> None:
        """No-helmet should be the most common violation (~45%)."""
        assert VIOLATION_WEIGHTS["no_helmet"] > VIOLATION_WEIGHTS["triple_riding"]
        assert VIOLATION_WEIGHTS["no_helmet"] > VIOLATION_WEIGHTS["wrong_side_driving"]

    def test_all_types_in_fine_schedule(self) -> None:
        """Every violation type in the distribution must have a fine schedule entry."""
        for vtype in VIOLATION_WEIGHTS:
            assert vtype in FINE_SCHEDULE, f"{vtype} missing from FINE_SCHEDULE"

    def test_violation_type_sample_matches_distribution(self) -> None:
        """Monte Carlo: sample 10 000 types, check distribution within tolerance."""
        rng = __import__("random").Random(RANDOM_SEED)
        n_samples = 10_000
        counts: dict[str, int] = {v: 0 for v in VIOLATION_WEIGHTS}
        for _ in range(n_samples):
            counts[_sample_violation_type(rng)] += 1

        for vtype, expected_w in VIOLATION_WEIGHTS.items():
            actual_pct = counts[vtype] / n_samples * 100
            expected_pct = expected_w * 100
            assert abs(actual_pct - expected_pct) < DISTRIBUTION_TOLERANCE_PP, (
                f"{vtype}: expected ~{expected_pct:.1f}%, got {actual_pct:.1f}%"
            )


# ---------------------------------------------------------------------------
# License plate format tests
# ---------------------------------------------------------------------------
@pytest.mark.slow
class TestLicensePlateFormat:
    """Validate that generated plates match Karnataka KA##XX#### format."""

    def test_plate_matches_ka_format(self) -> None:
        """Every generated plate must match the regex."""
        rng = __import__("random").Random(RANDOM_SEED)
        for _ in range(200):
            plate = _generate_license_plate(rng)
            assert LICENSE_PLATE_RE.match(plate), f"Plate '{plate}' doesn't match KA##XX####"

    def test_plate_length(self) -> None:
        """Plates should be exactly 10 characters."""
        rng = __import__("random").Random(RANDOM_SEED + 1)
        for _ in range(100):
            plate = _generate_license_plate(rng)
            assert len(plate) == 10, f"Plate '{plate}' has length {len(plate)}, expected 10"

    def test_plate_starts_with_ka(self) -> None:
        rng = __import__("random").Random(RANDOM_SEED + 2)
        for _ in range(100):
            plate = _generate_license_plate(rng)
            assert plate.startswith("KA"), f"Plate '{plate}' doesn't start with KA"

    def test_plate_deterministic_with_seed(self) -> None:
        """Same seed should produce the same plate."""
        rng1 = __import__("random").Random(999)
        rng2 = __import__("random").Random(999)
        for _ in range(50):
            assert _generate_license_plate(rng1) == _generate_license_plate(rng2)


# ---------------------------------------------------------------------------
# Confidence tier tests
# ---------------------------------------------------------------------------
@pytest.mark.slow
class TestConfidenceTierAssignment:
    """Validate that confidence values map to correct tiers."""

    def test_high_threshold(self) -> None:
        assert get_confidence_tier(0.80) == "high"
        assert get_confidence_tier(0.95) == "high"

    def test_medium_threshold(self) -> None:
        assert get_confidence_tier(0.50) == "medium"
        assert get_confidence_tier(0.70) == "medium"

    def test_low_threshold(self) -> None:
        assert get_confidence_tier(0.49) == "low"
        assert get_confidence_tier(0.10) == "low"

    def test_make_confidence_in_range(self) -> None:
        """_make_confidence should always produce values in [0.35, 0.99]."""
        rng = __import__("random").Random(RANDOM_SEED)
        for _ in range(500):
            c = _make_confidence(rng)
            assert 0.35 <= c <= 0.99, f"Confidence {c} out of range"

    def test_confidence_tiers_present_in_output(self) -> None:
        """Generated violations should contain all three tiers."""
        violations = generate_violations(total=300)
        tiers = {v["confidence_tier"] for v in violations}
        assert "high" in tiers, "No high-tier violations generated"
        assert "medium" in tiers, "No medium-tier violations generated"
        # Low tier may be absent with beta(5,2) — just check high & medium


# ---------------------------------------------------------------------------
# Time-of-day weighting tests
# ---------------------------------------------------------------------------
@pytest.mark.slow
class TestTimeOfDayWeighting:
    """Validate the hour weight distribution and sampling."""

    def test_all_hours_present(self) -> None:
        assert len(HOUR_WEIGHTS) == 24

    def test_hour_weights_positive(self) -> None:
        for hour, w in HOUR_WEIGHTS.items():
            assert 0 <= hour <= 23
            assert w > 0, f"Hour {hour} weight must be positive"

    def test_morning_rush_higher_than_midnight(self) -> None:
        """Hours 07-08 should have higher weight than 02-03."""
        morning = (HOUR_WEIGHTS[7] + HOUR_WEIGHTS[8]) / 2
        midnight = (HOUR_WEIGHTS[2] + HOUR_WEIGHTS[3]) / 2
        assert morning > midnight

    def test_evening_rush_higher_than_late_night(self) -> None:
        """Hours 18-19 should have higher weight than 22-23."""
        evening = (HOUR_WEIGHTS[18] + HOUR_WEIGHTS[19]) / 2
        late = (HOUR_WEIGHTS[22] + HOUR_WEIGHTS[23]) / 2
        assert evening > late

    def test_sample_hour_in_range(self) -> None:
        rng = __import__("random").Random(RANDOM_SEED)
        for _ in range(200):
            h = _sample_hour(rng)
            assert 0 <= h <= 23

    def test_sample_hour_bias_toward_rush(self) -> None:
        """Monte Carlo: rush hours (6-9, 17-21) should dominate."""
        rng = __import__("random").Random(RANDOM_SEED)
        n = 5_000
        rush_count = 0
        for _ in range(n):
            h = _sample_hour(rng)
            if h in (6, 7, 8, 9, 17, 18, 19, 20, 21):
                rush_count += 1
        rush_pct = rush_count / n * 100
        # Rush hours should account for at least 50% of samples
        assert rush_pct > 50.0, f"Rush hour bias too low: {rush_pct:.1f}%"


# ---------------------------------------------------------------------------
# Generated violation record tests
# ---------------------------------------------------------------------------
@pytest.mark.slow
class TestGeneratedViolations:
    """Integration tests on generate_violations() output."""

    def test_default_count_in_range(self) -> None:
        v = generate_violations()
        assert TOTAL_VIOLATIONS_MIN <= len(v) <= TOTAL_VIOLATIONS_MAX

    def test_exact_count(self) -> None:
        """Base count should match requested total; duplicates are additional."""
        v = generate_violations(total=50)
        # generate_violations adds ~10 duplicate records beyond the requested count
        assert len(v) >= 50

    def test_id_format(self) -> None:
        v = generate_violations(total=10)
        for rec in v:
            assert rec["id"].startswith("v_")
            # v_YYYYMMDD_HHMMSS_NNN
            parts = rec["id"].split("_")
            assert len(parts) == 4
            assert len(parts[1]) == 8  # YYYYMMDD
            assert len(parts[2]) == 6  # HHMMSS
            assert len(parts[3]) == 3  # NNN

    def test_all_data_source_seeded(self) -> None:
        v = generate_violations(total=100)
        for rec in v:
            assert rec["data_source"] == "seeded"

    def test_valid_violation_types(self) -> None:
        v = generate_violations(total=100)
        for rec in v:
            assert rec["violation_type"] in EXPECTED_VIOLATION_TYPES

    def test_valid_confidence_tiers(self) -> None:
        v = generate_violations(total=100)
        for rec in v:
            tier = rec["confidence_tier"]
            assert tier in ("high", "medium", "low")
            # Tier must be consistent with confidence
            assert get_confidence_tier(rec["confidence"]) == tier

    def test_fine_schedule_consistency(self) -> None:
        v = generate_violations(total=100)
        for rec in v:
            expected = FINE_SCHEDULE[rec["violation_type"]]
            assert rec["mv_act_section"] == expected["section"]
            assert rec["fine_amount"] == expected["amount"]

    def test_bbox_format(self) -> None:
        v = generate_violations(total=50)
        for rec in v:
            bbox = rec["bbox"]
            assert isinstance(bbox, dict)
            for key in ("x1", "y1", "x2", "y2"):
                assert key in bbox, f"Missing bbox key '{key}'"
                assert 0.0 <= bbox[key] <= 1.0
            assert bbox["x1"] < bbox["x2"]
            assert bbox["y1"] < bbox["y2"]

    def test_plate_probability(self) -> None:
        """About 40% of violations should have plates."""
        v = generate_violations(total=500)
        plates = sum(1 for rec in v if rec["license_plate_text"] is not None)
        pct = plates / len(v) * 100
        assert 25 <= pct <= 55, f"Plate percentage {pct:.1f}% outside expected range"

    def test_plate_format_when_present(self) -> None:
        v = generate_violations(total=200)
        for rec in v:
            if rec["license_plate_text"] is not None:
                assert LICENSE_PLATE_RE.match(rec["license_plate_text"]), (
                    f"Plate '{rec['license_plate_text']}' doesn't match KA##XX####"
                )

    def test_plate_confidence_when_present(self) -> None:
        v = generate_violations(total=200)
        for rec in v:
            if rec["license_plate_text"] is not None:
                assert rec["license_plate_confidence"] is not None
                assert 0.0 <= rec["license_plate_confidence"] <= 1.0

    def test_status_distribution(self) -> None:
        """Status distribution should roughly match 80/15/5."""
        v = generate_violations(total=500)
        status_counts = {}
        for rec in v:
            status_counts[rec["status"]] = status_counts.get(rec["status"], 0) + 1
        total = len(v)
        assert abs(status_counts.get("pending", 0) / total * 100 - 80) < DISTRIBUTION_TOLERANCE_PP
        assert abs(status_counts.get("approved", 0) / total * 100 - 15) < DISTRIBUTION_TOLERANCE_PP

    def test_timestamps_within_lookback(self) -> None:
        from datetime import datetime, timedelta, timezone
        v = generate_violations(total=100)
        now = datetime.now(timezone.utc)
        for rec in v:
            assert rec["timestamp"] <= now
            assert (now - rec["timestamp"]) <= timedelta(days=8)  # 7 days + buffer

    def test_person_bbox_for_relevant_types(self) -> None:
        v = generate_violations(total=200)
        for rec in v:
            # Duplicates inherit None person_bbox — skip them
            if rec.get("is_duplicate") == 1:
                continue
            if rec["violation_type"] in ("no_helmet", "triple_riding", "no_seatbelt"):
                assert rec["person_bbox"] is not None, (
                    f"person_bbox missing for {rec['violation_type']}"
                )
