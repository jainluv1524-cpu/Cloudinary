"""Change detection endpoint."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, Request

from src.schemas.requests import DetectChangeRequest, DetectChangeResponse

logger = structlog.get_logger()

router = APIRouter()


@router.post("/detect-change", response_model=DetectChangeResponse)
async def detect_change(request: Request, body: DetectChangeRequest) -> DetectChangeResponse:
    """Detect changes between before/after image pairs.

    Uses the model registry to route to the correct sector model.
    Returns unsupported for sectors without a trained model — never
    falls back to another sector's model (AGENTS.md §3.3).
    """
    claims = request.state.claims

    logger.info(
        "detect_change_request",
        sector=body.sector,
        org_id=claims.get("org_id"),
        job_id=claims.get("job_id"),
    )

    # TODO: Resolve model from registry
    # For MVP, only forestry is "trained" (placeholder)
    if body.sector != "forestry":
        return DetectChangeResponse(
            status="unsupported",
            reason=f"No trained model for sector: {body.sector}",
        )

    # TODO: Actual model inference
    # 1. Download before/after images from Cloudinary URLs
    # 2. Run YOLOv8 sapling detector on both
    # 3. Run ChangeFormer for change mask
    # 4. Quantify changes (count delta, area change)
    # 5. Render diff PNG, upload to Cloudinary
    # 6. Return metrics + diff URL

    return DetectChangeResponse(
        status="ok",
        change_type="sapling_planting",
        change_metrics={
            "saplings_planted": 0,
            "area_covered_sqm": 0.0,
            "planting_density_per_sqm": 0.0,
            "before_count": 0,
            "after_count": 0,
            "alignment_quality": 0.0,
        },
        confidence=0.0,
        diff_url=None,
        model_version="forestry-placeholder-v0.1.0",
    )
