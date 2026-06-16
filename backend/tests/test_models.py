"""Unit tests for SQLAlchemy ORM models and fine schedule."""

import pytest

from backend.app.db.models import (
    FINE_SCHEDULE,
    get_confidence_tier,
    ViolationTypeDB,
    ViolationStatusDB,
    ConfidenceTierDB,
    DataSourceDB,
)


class TestFineSchedule:
    """Tests for the MV Act fine schedule mapping."""

    def test_all_violation_types_have_entries(self) -> None:
        for vtype in ViolationTypeDB:
            assert vtype.value in FINE_SCHEDULE, f"Missing fine entry for {vtype.value}"

    def test_all_entries_have_section(self) -> None:
        for vtype, info in FINE_SCHEDULE.items():
            assert "section" in info, f"{vtype} missing section"
            assert isinstance(info["section"], str)

    def test_all_entries_have_amount(self) -> None:
        for vtype, info in FINE_SCHEDULE.items():
            assert "amount" in info, f"{vtype} missing amount"
            assert isinstance(info["amount"], int)
            assert info["amount"] > 0

    def test_known_fine_amounts(self) -> None:
        assert FINE_SCHEDULE["no_helmet"]["amount"] == 500
        assert FINE_SCHEDULE["triple_riding"]["amount"] == 1000
        assert FINE_SCHEDULE["illegal_parking"]["amount"] == 200
        assert FINE_SCHEDULE["no_seatbelt"]["amount"] == 1000

    def test_known_mv_act_sections(self) -> None:
        assert FINE_SCHEDULE["no_helmet"]["section"] == "129"
        assert FINE_SCHEDULE["triple_riding"]["section"] == "184"
        assert FINE_SCHEDULE["illegal_parking"]["section"] == "122"
        assert FINE_SCHEDULE["no_seatbelt"]["section"] == "194B"


class TestGetConfidenceTier:
    """Tests for confidence tier assignment."""

    def test_high_tier(self) -> None:
        assert get_confidence_tier(0.85) == "high"
        assert get_confidence_tier(0.80) == "high"
        assert get_confidence_tier(1.0) == "high"

    def test_medium_tier(self) -> None:
        assert get_confidence_tier(0.65) == "medium"
        assert get_confidence_tier(0.50) == "medium"

    def test_low_tier(self) -> None:
        assert get_confidence_tier(0.49) == "low"
        assert get_confidence_tier(0.1) == "low"
        assert get_confidence_tier(0.0) == "low"

    def test_boundary_values(self) -> None:
        assert get_confidence_tier(0.799) == "medium"
        assert get_confidence_tier(0.499) == "low"


class TestViolationEnums:
    """Tests for database enum completeness."""

    def test_violation_type_enum_values(self) -> None:
        assert ViolationTypeDB.NO_HELMET.value == "no_helmet"
        assert ViolationTypeDB.TRIPLE_RIDING.value == "triple_riding"
        assert ViolationTypeDB.WRONG_SIDE_DRIVING.value == "wrong_side_driving"
        assert ViolationTypeDB.ILLEGAL_PARKING.value == "illegal_parking"
        assert ViolationTypeDB.NO_SEATBELT.value == "no_seatbelt"
        assert ViolationTypeDB.STOP_LINE_VIOLATION.value == "stop_line_violation"
        assert ViolationTypeDB.RED_LIGHT_VIOLATION.value == "red_light_violation"
        assert ViolationTypeDB.LICENSE_PLATE_MISMATCH.value == "license_plate_mismatch"

    def test_status_enum_values(self) -> None:
        assert ViolationStatusDB.PENDING.value == "pending"
        assert ViolationStatusDB.APPROVED.value == "approved"
        assert ViolationStatusDB.REJECTED.value == "rejected"

    def test_confidence_tier_enum_values(self) -> None:
        assert ConfidenceTierDB.HIGH.value == "high"
        assert ConfidenceTierDB.MEDIUM.value == "medium"
        assert ConfidenceTierDB.LOW.value == "low"

    def test_data_source_enum_values(self) -> None:
        assert DataSourceDB.SEEDED.value == "seeded"
        assert DataSourceDB.LIVE.value == "live"

    def test_enum_count(self) -> None:
        assert len(ViolationTypeDB) == 8
        assert len(ViolationStatusDB) == 3
        assert len(ConfidenceTierDB) == 3
        assert len(DataSourceDB) == 2
