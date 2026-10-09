"""Esquemas de validación (Pydantic) de la API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from backend.core.security import sanitize_text


class GreetingCreate(BaseModel):
    """Entrada para crear un saludo."""

    name: str = Field(..., min_length=2, max_length=60, examples=["Amigo"])
    message: str = Field(..., min_length=5, max_length=500, examples=["Feliz cumpleaños."])

    @field_validator("name", "message")
    @classmethod
    def _clean(cls, value: str) -> str:
        cleaned = sanitize_text(value)
        if not cleaned:
            raise ValueError("El texto no puede estar vacío tras sanitizarlo.")
        return cleaned


class GreetingOut(BaseModel):
    """Saludo devuelto por la API."""

    id: int
    name: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GreetingList(BaseModel):
    items: list[GreetingOut]
    total: int
