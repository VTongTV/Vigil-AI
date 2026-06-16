"""Root conftest.py — registers custom pytest markers.

Markers:
    slow: Integration tests that load real models and run full inference.
          Skip with: pytest -m "not slow"
"""

import pytest


def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers to avoid unknown-marker warnings."""
    config.addinivalue_line("markers", "slow: integration tests requiring GPU model loading")
