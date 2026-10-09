"""Esquemas de salud y configuración pública."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class HealthOut(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime


class ConfigOut(BaseModel):
    """Configuración pública reenviada por la API (sin secretos)."""

    project: dict[str, Any]
    birthday: dict[str, Any]
    seo: dict[str, Any]
    generatedAt: datetime
