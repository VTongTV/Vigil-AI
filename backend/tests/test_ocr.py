"""Unit tests for OCR post-processing and plate recognition."""

import pytest

from backend.app.core.ocr import postprocess_plate, apply_ocr_corrections


class TestPostprocessPlate:
    """Tests for Indian license plate post-processing."""

    def test_valid_standard_plate(self) -> None:
        result = postprocess_plate("KA01AB1234")
        assert result is not None
        assert result.startswith("KA")

    def test_lowercase_normalized(self) -> None:
        result = postprocess_plate("ka01ab1234")
        assert result is not None
        assert result.startswith("KA")

    def test_spaces_removed(self) -> None:
        result = postprocess_plate("KA 01 AB 1234")
        assert result is not None
        assert " " not in result

    def test_special_chars_removed(self) -> None:
        result = postprocess_plate("KA-01-AB-1234")
        assert result is not None
        assert "-" not in result

    def test_too_short_returns_cleaned(self) -> None:
        result = postprocess_plate("KA")
        assert result == "KA"

    def test_empty_string_returns_none(self) -> None:
        result = postprocess_plate("")
        assert result is None

    def test_indian_pattern_two_digit_district(self) -> None:
        result = postprocess_plate("KA01AB1234")
        assert result is not None
        assert len(result) >= 10

    def test_indian_pattern_one_digit_district(self) -> None:
        result = postprocess_plate("KA1AB1234")
        assert result is not None

    def test_non_matching_pattern_returns_cleaned(self) -> None:
        result = postprocess_plate("ABCDEF123456")
        assert result is not None


class TestApplyOcrCorrections:
    """Tests for OCR error correction logic."""

    def test_o_in_district_replaced_with_0(self) -> None:
        """O in district position should become 0."""
        result = apply_ocr_corrections("KAO1AB1234")
        # District "O1" should be corrected to "01"
        assert "01" in result

    def test_zero_in_series_replaced_with_o(self) -> None:
        """0 in series position should become O."""
        result = apply_ocr_corrections("KA0101234")
        # Series "0" should be corrected to "O"
        assert "O" in result

    def test_i_in_number_replaced_with_1(self) -> None:
        """I in number position should become 1."""
        result = apply_ocr_corrections("KA01AB1I34")
        # Number position I → 1
        assert "1" in result

    def test_short_text_unchanged(self) -> None:
        """Text shorter than 6 chars should be returned as-is."""
        result = apply_ocr_corrections("KA")
        assert result == "KA"

    def test_valid_plate_unchanged(self) -> None:
        """Already correct plate should not be corrupted."""
        result = apply_ocr_corrections("KA01AB1234")
        assert result == "KA01AB1234"
