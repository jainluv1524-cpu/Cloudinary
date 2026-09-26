"""Pydantic request/response models for all ML endpoints."""

from __future__ import annotations

from pydantic import BaseModel, HttpUrl


class GpsPoint(BaseModel):
    lat: float
    lon: float


# ─── Detect Change ─────────────────────────────────

class DetectChangeRequest(BaseModel):
    before_url: str
    after_url: str
    sector: str
    project_id: str
    gps_before: GpsPoint
    gps_after: GpsPoint
    accuracy_before: float
    accuracy_after: float


class DetectChangeResponse(BaseModel):
    status: str  # "ok" | "unsupported" | "error"
    reason: str | None = None
    change_type: str | None = None
    change_metrics: dict[str, float] | None = None
    confidence: float | None = None
    diff_url: str | None = None
    model_version: str | None = None


# ─── Classify Activity ─────────────────────────────

class ClassifyActivityRequest(BaseModel):
    asset_url: str
    sector: str


class ClassifyActivityResponse(BaseModel):
    status: str
    reason: str | None = None
    activity_type: str | None = None
    phase: str | None = None
    confidence: float | None = None
    indicators: dict[str, object] | None = None


# ─── Extract Signals ───────────────────────────────

class ExtractSignalsRequest(BaseModel):
    asset_url: str
    sector: str


class ExtractSignalsResponse(BaseModel):
    status: str
    reason: str | None = None
    vegetation_index: float | None = None
    water_present: bool | None = None
    smoke: bool | None = None
    machinery: list[str] | None = None
    bare_ground_pct: float | None = None
    canopy_cover_pct: float | None = None
