"""Health check endpoints."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@router.get("/model-info")
async def model_info() -> dict[str, object]:
    """Return loaded model versions."""
    # TODO: Return actual loaded model info from registry
    return {
        "models": {
            "forestry": {"status": "placeholder", "version": "0.1.0"},
            "water": {"status": "unsupported"},
            "infrastructure": {"status": "unsupported"},
            "agriculture": {"status": "unsupported"},
        }
    }
