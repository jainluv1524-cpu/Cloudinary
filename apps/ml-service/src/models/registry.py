"""Model registry — loads models lazily per (key, version)."""

from __future__ import annotations

import structlog
from typing import Any

logger = structlog.get_logger()

# Cache loaded models by (key, version) to avoid re-instantiation (AGENTS.md §4)
_model_cache: dict[tuple[str, str], Any] = {}


class ModelNotTrainedError(Exception):
    """Raised when a sector has no trained model."""

    def __init__(self, sector: str) -> None:
        super().__init__(f"No trained model for sector: {sector}")
        self.sector = sector


def get_model(key: str, version: str) -> Any:
    """Load or retrieve a cached model.

    Models are loaded once per (key, version) and cached on the model object.
    Never instantiate a detector inside a request handler.
    """
    cache_key = (key, version)
    if cache_key in _model_cache:
        return _model_cache[cache_key]

    # TODO: Load actual model weights from weights_dir
    # For now, return placeholder for forestry sector only
    logger.info("loading_model", key=key, version=version)

    if key == "forestry":
        model = {"key": key, "version": version, "status": "placeholder"}
        _model_cache[cache_key] = model
        return model

    raise ModelNotTrainedError(key)
