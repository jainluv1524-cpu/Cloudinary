"""Visual signal extraction endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request

from src.schemas.requests import ExtractSignalsRequest, ExtractSignalsResponse

router = APIRouter()


@router.post("/extract-signals", response_model=ExtractSignalsResponse)
async def extract_signals(
    request: Request, body: ExtractSignalsRequest
) -> ExtractSignalsResponse:
    """Extract visual signals from an asset image."""
    if body.sector != "forestry":
        return ExtractSignalsResponse(
            status="unsupported",
            reason=f"No trained model for sector: {body.sector}",
        )

    # TODO: Actual signal extraction
    return ExtractSignalsResponse(
        status="ok",
        vegetation_index=0.0,
        water_present=False,
        smoke=False,
        machinery=[],
        bare_ground_pct=0.0,
        canopy_cover_pct=0.0,
    )
