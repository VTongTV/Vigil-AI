"""VigilAI application configuration.

Loads settings from environment variables and configs/default.yaml.
All tunable parameters live in the YAML config — no magic numbers in code.
"""

import logging
from pathlib import Path
from typing import Optional

import yaml
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

# Project root: Round 2/ (where this repo lives)
# config.py is at Round 2/backend/app/config.py → 3 parents up
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CONFIG_PATH = PROJECT_ROOT / "configs" / "default.yaml"


def _load_yaml_config() -> dict:
    """Load the default.yaml configuration file.

    Returns:
        Dictionary of configuration values.

    Raises:
        FileNotFoundError: If configs/default.yaml does not exist.
    """
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Config file not found: {CONFIG_PATH}")
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


_YAML_CONFIG = _load_yaml_config()


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Environment variables override defaults. YAML config is accessible
    via the `yaml_config` property for nested values (model paths,
    thresholds, violation parameters, etc.).
    """

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Paths
    project_root: Path = PROJECT_ROOT
    weights_dir: Path = PROJECT_ROOT / "backend" / "weights"
    evidence_dir: Path = PROJECT_ROOT / "outputs" / "evidence"
    db_path: Path = PROJECT_ROOT / "outputs" / "vigilai.db"

    # Demo mode
    demo_mode: bool = False

    # CORS — supports Railway domains via wildcard env var
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Image upload
    max_image_size_mb: int = 10

    model_config = {"env_prefix": "VIGILAI_"}


settings = Settings()


def get_model_config(model_name: str) -> dict:
    """Get configuration for a specific model from default.yaml.

    Args:
        model_name: One of 'coco', 'helmet', 'plate'.

    Returns:
        Model configuration dictionary.

    Raises:
        ValueError: If model_name is not a valid key.
    """
    models = _YAML_CONFIG.get("models", {})
    if model_name not in models:
        raise ValueError(
            f"Unknown model '{model_name}'. Available: {list(models.keys())}"
        )
    return models[model_name]


def get_preprocessing_config() -> dict:
    """Get preprocessing configuration from default.yaml."""
    return _YAML_CONFIG.get("preprocessing", {})


def get_violation_config(violation_name: str) -> dict:
    """Get configuration for a specific violation type.

    Args:
        violation_name: One of 'helmet', 'triple_riding', 'wrong_side',
            'illegal_parking', 'seatbelt', 'stop_line', 'red_light'.

    Returns:
        Violation configuration dictionary.

    Raises:
        ValueError: If violation_name is not a valid key.
    """
    violations = _YAML_CONFIG.get("violations", {})
    if violation_name not in violations:
        raise ValueError(
            f"Unknown violation '{violation_name}'. Available: {list(violations.keys())}"
        )
    return violations[violation_name]


def get_ocr_config() -> dict:
    """Get OCR configuration from default.yaml."""
    return _YAML_CONFIG.get("ocr", {})


def get_evidence_config() -> dict:
    """Get evidence generation configuration from default.yaml."""
    return _YAML_CONFIG.get("evidence", {})


def get_demo_cameras() -> list[dict]:
    """Get demo camera locations from default.yaml."""
    demo = _YAML_CONFIG.get("demo", {})
    return demo.get("cameras", [])


def get_camera_info(camera_id: str) -> dict:
    """Look up camera metadata (name, lat, lng) by camera ID.

    Args:
        camera_id: Camera identifier string (e.g. 'MGROAD-01').

    Returns:
        Dict with 'name', 'lat', 'lng' keys, or empty dict if not found.
    """
    for cam in get_demo_cameras():
        if cam.get("id") == camera_id:
            return {
                "junction_name": cam.get("name", ""),
                "latitude": cam.get("lat"),
                "longitude": cam.get("lng"),
            }
    return {}


def get_traffic_signal_config() -> dict:
    """Get traffic signal configuration from default.yaml."""
    violations = _YAML_CONFIG.get("violations", {})
    return violations.get("red_light", {})
