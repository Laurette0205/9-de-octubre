"""Pruebas del servicio de configuración pública."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from backend.tests._client import TestClient

from backend.main import app
from backend.services import config_service

client = TestClient(app)


def test_public_config_exposes_only_allowed_sections() -> None:
    response = client.get("/api/config")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"project", "birthday", "seo", "generatedAt"}


def test_public_config_has_no_secret_like_keys() -> None:
    payload = client.get("/api/config").json()
    forbidden = {"secret", "token", "password", "api_key", "apikey", "credential"}
    serialized = json.dumps(payload).lower()
    assert not any(word in serialized for word in forbidden)


def test_required_fields_validation_passes_for_shipped_config() -> None:
    response = client.get("/api/config/validate")
    assert response.status_code == 200
    payload = response.json()
    assert payload["valid"] is True
    assert payload["missing"] == []


def test_missing_required_fields_are_reported(tmp_path: Path) -> None:
    broken = tmp_path / "birthday.config.json"
    broken.write_text(json.dumps({"project": {}, "birthday": {}}), encoding="utf-8")
    config = json.loads(broken.read_text(encoding="utf-8"))
    missing = config_service.validate_required_fields(config)
    assert "birthday.date" in missing


def test_invalid_json_raises_config_error(tmp_path: Path) -> None:
    broken = tmp_path / "birthday.config.json"
    broken.write_text("{ no es json", encoding="utf-8")
    config_service.load_config.cache_clear()
    with pytest.raises(config_service.ConfigError):
        config_service.load_config(broken)
    config_service.load_config.cache_clear()
