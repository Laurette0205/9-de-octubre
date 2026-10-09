"""Reglas de negocio de los saludos: validación de límites y persistencia."""

from __future__ import annotations

from backend.models.greeting import GreetingRepository
from backend.schemas.greeting import GreetingCreate


class GreetingService:
    """Coordina validación de negocio y repositorio (SRP)."""

    def __init__(self, repository: GreetingRepository, max_message_length: int = 500) -> None:
        self.repository = repository
        self.max_message_length = max_message_length

    def create(self, payload: GreetingCreate) -> dict:
        if len(payload.message) > self.max_message_length:
            raise ValueError(f"El mensaje supera {self.max_message_length} caracteres.")
        if len(payload.name) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return self.repository.create(payload.name.strip(), payload.message.strip())

    def list(self, limit: int = 50) -> list[dict]:
        safe_limit = max(1, min(limit, 100))
        return self.repository.list(limit=safe_limit)

    def get(self, greeting_id: int) -> dict | None:
        return self.repository.get(greeting_id)

    def count(self) -> int:
        return self.repository.count()
