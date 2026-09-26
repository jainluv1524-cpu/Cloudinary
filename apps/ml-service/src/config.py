"""Application configuration loaded from environment."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import BaseModel


class Settings(BaseModel):
    """Application settings from environment variables."""

    cloudinary_cloud_name: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key: str = os.getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret: str = os.getenv("CLOUDINARY_API_SECRET", "")

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    internal_jwt_secret: str = os.getenv("INTERNAL_JWT_SECRET", "")

    weights_dir: str = os.getenv("WEIGHTS_DIR", "./weights")

    port: int = int(os.getenv("PORT", "8000"))
    host: str = os.getenv("HOST", "0.0.0.0")


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
