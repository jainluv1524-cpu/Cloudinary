"""Impact Media Intelligence Platform — ML Service."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.routes import detect_change, classify_activity, extract_signals, health
from src.middleware.auth import verify_internal_jwt

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Load models on startup, clean up on shutdown."""
    logger.info("ml_service_starting")
    # Model loading happens lazily on first request per (key, version)
    yield
    logger.info("ml_service_stopping")


app = FastAPI(
    title="Impact ML Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("API_URL", "http://localhost:3001")],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, tags=["health"])
app.include_router(detect_change.router, prefix="/v1", tags=["detection"])
app.include_router(classify_activity.router, prefix="/v1", tags=["classification"])
app.include_router(extract_signals.router, prefix="/v1", tags=["signals"])


@app.middleware("http")
async def auth_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Verify internal JWT on all /v1/ endpoints."""
    if request.url.path.startswith("/v1/"):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "Missing or invalid Authorization header"},
            )
        token = auth_header[7:]
        claims = verify_internal_jwt(token)
        if claims is None:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid or expired internal JWT"},
            )
        request.state.claims = claims

    response = await call_next(request)
    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "development") == "development",
    )
