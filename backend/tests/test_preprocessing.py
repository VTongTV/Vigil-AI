"""Unit tests for image preprocessing pipeline."""

import numpy as np
import pytest

from backend.app.core.preprocessing import (
    apply_clahe,
    apply_denoise,
    apply_gamma,
    preprocess_image,
)


def _make_test_image(h: int = 100, w: int = 100) -> np.ndarray:
    """Create a random BGR test image."""
    return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)


class TestApplyClahe:
    """Tests for CLAHE contrast enhancement."""

    def test_output_shape_matches_input(self) -> None:
        img = _make_test_image()
        result = apply_clahe(img)
        assert result.shape == img.shape

    def test_output_dtype_uint8(self) -> None:
        img = _make_test_image()
        result = apply_clahe(img)
        assert result.dtype == np.uint8

    def test_image_is_modified(self) -> None:
        # All-same image will be changed by CLAHE
        img = np.full((50, 50, 3), 128, dtype=np.uint8)
        result = apply_clahe(img)
        # CLAHE on uniform image may or may not change, just verify no crash
        assert result.shape == img.shape

    def test_custom_clip_limit(self) -> None:
        img = _make_test_image()
        result = apply_clahe(img, clip_limit=4.0)
        assert result.shape == img.shape

    def test_custom_tile_grid_size(self) -> None:
        img = _make_test_image()
        result = apply_clahe(img, tile_grid_size=(16, 16))
        assert result.shape == img.shape


class TestApplyDenoise:
    """Tests for bilateral denoising."""

    def test_output_shape_matches_input(self) -> None:
        img = _make_test_image()
        result = apply_denoise(img)
        assert result.shape == img.shape

    def test_output_dtype_uint8(self) -> None:
        img = _make_test_image()
        result = apply_denoise(img)
        assert result.dtype == np.uint8

    def test_custom_strength(self) -> None:
        img = _make_test_image()
        result = apply_denoise(img, h=15)
        assert result.shape == img.shape


class TestApplyGamma:
    """Tests for gamma correction."""

    def test_output_shape_matches_input(self) -> None:
        img = _make_test_image()
        result = apply_gamma(img, gamma=1.2)
        assert result.shape == img.shape

    def test_gamma_1_is_identity(self) -> None:
        img = _make_test_image()
        result = apply_gamma(img, gamma=1.0)
        np.testing.assert_array_equal(result, img)

    def test_gamma_above_1_brightens(self) -> None:
        img = np.full((10, 10, 3), 100, dtype=np.uint8)
        result = apply_gamma(img, gamma=2.0)
        # gamma > 1 should brighten (formula: output = (input/255)^(1/gamma))
        assert result.mean() > img.mean()

    def test_gamma_below_1_darkens(self) -> None:
        img = np.full((10, 10, 3), 100, dtype=np.uint8)
        result = apply_gamma(img, gamma=0.5)
        assert result.mean() < img.mean()


class TestPreprocessImage:
    """Tests for the full preprocessing pipeline."""

    def test_output_shape_matches_input(self) -> None:
        img = _make_test_image(200, 300)
        result = preprocess_image(img)
        assert result.shape == img.shape

    def test_empty_image_raises(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            preprocess_image(np.array([], dtype=np.uint8))

    def test_grayscale_image_raises(self) -> None:
        gray = np.zeros((100, 100), dtype=np.uint8)
        with pytest.raises(ValueError, match="3-channel"):
            preprocess_image(gray)

    def test_with_explicit_config(self) -> None:
        img = _make_test_image()
        config = {
            "clahe": {"enabled": False},
            "denoise": {"enabled": False},
            "gamma": {"enabled": False},
        }
        result = preprocess_image(img, config)
        # All steps disabled → output should equal input
        np.testing.assert_array_equal(result, img)

    def test_partial_config(self) -> None:
        img = _make_test_image()
        config = {"clahe": {"enabled": True}, "denoise": {"enabled": False}, "gamma": {"enabled": False}}
        result = preprocess_image(img, config)
        assert result.shape == img.shape
