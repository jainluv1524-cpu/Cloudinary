"""Internal JWT verification for API → ML auth."""

from __future__ import annotations

import os
from typing import Any

import jwt


def verify_internal_jwt(token: str) -> dict[str, Any] | None:
    """Verify the internal JWT minted by the API.

    Returns claims dict or None if invalid/expired.
    The API mints a 120s HS256 JWT with claims: sub, org_id, job_id.
    """
    secret = os.getenv("INTERNAL_JWT_SECRET", "")
    if not secret:
        return None

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "org_id", "job_id", "exp"]},
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
