"""Image preprocessing for traffic camera images.

Applies CLAHE, bilateral filtering, and gamma correction to enhance
image quality before detection. All parameters come from configs/default.yaml.
"""

import logging
from typing import Optional

import cv2
import numpy as np

from backend.app.config import get_preprocessing_config

logger = logging.getLogger(__name__)


def preprocess_image(
    image: np.ndarray,
    config: Optional[dict] = None,
) -> np.ndarray:
    """Apply preprocessing pipeline to enhance traffic camera images.

    Pipeline: CLAHE → Denoise → Gamma correction.
    Each step is configurable and can be disabled independently.

    Args:
        image: Input image in BGR format (HWC, uint8).
        config: Preprocessing config dict. If None, loaded from default.yaml.

    Returns:
        Preprocessed image in BGR format (HWC, uint8).

    Raises:
        ValueError: If image is empty or has wrong number of channels.
    """
    if image.size == 0:
        raise ValueError("Cannot preprocess empty image")
    if len(image.shape) != 3 or image.shape[2] != 3:
        raise ValueError(
            f"Expected 3-channel BGR image, got shape {image.shape}"
        )

    if config is None:
        config = get_preprocessing_config()

    result = image.copy()

    # Step 1: CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe_cfg = config.get("clahe", {})
    if clahe_cfg.get("enabled", True):
        result = apply_clahe(
            result,
            clip_limit=clahe_cfg.get("clip_limit", 2.0),
            tile_grid_size=tuple(clahe_cfg.get("tile_grid_size", [8, 8])),
        )

    # Step 2: Bilateral filter (edge-preserving denoising)
    denoise_cfg = config.get("denoise", {})
    if denoise_cfg.get("enabled", True):
        result = apply_denoise(
            result,
            h=denoise_cfg.get("h", 10),
            template_window_size=denoise_cfg.get("template_window_size", 7),
            search_window_size=denoise_cfg.get("search_window_size", 21),
        )

    # Step 3: Gamma correction
    gamma_cfg = config.get("gamma", {})
    if gamma_cfg.get("enabled", True):
        result = apply_gamma(
            result,
            gamma=gamma_cfg.get("value", 1.2),
        )

    return result


def apply_clahe(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Apply CLAHE to enhance local contrast.

    Converts to LAB color space, applies CLAHE to the L channel,
    then converts back to BGR.

    Args:
        image: BGR image (HWC, uint8).
        clip_limit: Threshold for contrast limiting.
        tile_grid_size: Size of grid for histogram equalization.

    Returns:
        CLAHE-enhanced BGR image.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=clip_limit, tileGridSize=tile_grid_size
    )
    l_enhanced = clahe.apply(l_channel)

    lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
    return cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)


def apply_denoise(
    image: np.ndarray,
    h: int = 10,
    template_window_size: int = 7,
    search_window_size: int = 21,
) -> np.ndarray:
    """Apply bilateral filter for edge-preserving denoising.

    Uses non-local means denoising which preserves edges better
    than Gaussian blur — critical for maintaining bbox boundaries.

    Args:
        image: BGR image (HWC, uint8).
        h: Filter strength. Higher = more denoising but less detail.
        template_window_size: Size of template patch (must be odd).
        search_window_size: Size of search window (must be odd).

    Returns:
        Denoised BGR image.
    """
    return cv2.fastNlMeansDenoisingColored(
        image,
        None,
        h=h,
        hForColorComponents=h,
        templateWindowSize=template_window_size,
        searchWindowSize=search_window_size,
    )


def apply_gamma(image: np.ndarray, gamma: float = 1.2) -> np.ndarray:
    """Apply gamma correction to adjust image brightness.

    Args:
        image: BGR image (HWC, uint8).
        gamma: Gamma value. <1.0 brightens, >1.0 darkens.
            Typical range: 0.8 (brighten low-light) to 1.5 (darken).

    Returns:
        Gamma-corrected BGR image.
    """
    if gamma == 1.0:
        return image

    inv_gamma = 1.0 / gamma
    lut = np.array(
        [((i / 255.0) ** inv_gamma) * 255 for i in range(256)]
    ).astype("uint8")

    return cv2.LUT(image, lut)
