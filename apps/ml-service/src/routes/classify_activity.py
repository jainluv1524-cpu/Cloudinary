"""Activity classification endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request

from src.schemas.requests import ClassifyActivityRequest, ClassifyActivityResponse

router = APIRouter()


@router.post("/classify-activity", response_model=ClassifyActivityResponse)
async def classify_activity(
    request: Request, body: ClassifyActivityRequest
) -> ClassifyActivityResponse:
    """Classify activity visible in an asset image."""
    if body.sector != "forestry":
        return ClassifyActivityResponse(
            status="unsupported",
            reason=f"No trained model for sector: {body.sector}",
        )

    # TODO: Actual classification
    return ClassifyActivityResponse(
        status="ok",
        activity_type="planting",
        phase="after",
        confidence=0.0,
        indicators={},
    )
