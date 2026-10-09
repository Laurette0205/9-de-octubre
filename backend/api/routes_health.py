"""Rutas de salud del servicio."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from backend.config.settings import get_settings
from backend.schemas.config import HealthOut

router = APIRouter(tags=["salud"])


@router.get("/api/health", response_model=HealthOut, summary="Estado del servicio")
def health() -> HealthOut:
    settings = get_settings()
    return HealthOut(
        status="ok",
        service=settings.app_name,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
    )
