"""Servicio de configuración: carga y expone la configuración pública."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.config.settings import CONFIG_FILE

# Sólo se publican estos bloques: la API nunca expone claves ni secretos.
PUBLIC_SECTIONS = ("project", "birthday", "seo")


class ConfigError(RuntimeError):
    """La configuración del proyecto no pudo cargarse."""


@lru_cache(maxsize=1)
def load_config(path: Path | None = None) -> dict[str, Any]:
    config_path = Path(path) if path else CONFIG_FILE
    if not config_path.exists():
        raise ConfigError(f"No se encontró {config_path}")
    try:
        raw = config_path.read_text(encoding="utf-8")
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ConfigError(f"JSON inválido en {config_path}: {error}") from error
    if not isinstance(data, dict):
        raise ConfigError("La raíz de la configuración debe ser un objeto.")
    return data


def get_public_config(path: Path | None = None) -> dict[str, Any]:
    config = load_config(path)
    payload: dict[str, Any] = {key: config.get(key, {}) for key in PUBLIC_SECTIONS}
    payload["generatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return payload


def validate_required_fields(config: dict[str, Any]) -> list[str]:
    """Devuelve la lista de campos obligatorios que falten."""
    required = {
        "project.name": config.get("project", {}).get("name"),
        "birthday.date": config.get("birthday", {}).get("date"),
        "birthday.name": config.get("birthday", {}).get("name"),
        "hero.title": config.get("hero", {}).get("title"),
    }
    return [field for field, value in required.items() if not value]
