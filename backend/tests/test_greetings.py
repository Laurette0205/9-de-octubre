"""Pruebas de los saludos: validación, persistencia y límite de peticiones."""

from __future__ import annotations

import pytest
from backend.tests._client import TestClient

from backend.api import routes_greetings
from backend.config.settings import get_settings
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _isolated_database(tmp_path, monkeypatch):  # noqa: ANN001
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "greetings.db"))
    get_settings.cache_clear()
    routes_greetings._limiter.reset()
    yield
    get_settings.cache_clear()


def test_create_greeting_returns_201() -> None:
    response = client.post("/api/greetings", json={"name": "Carlos", "message": "Feliz cumpleaños, crack."})
    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Carlos"
    assert payload["id"] > 0


def test_create_greeting_strips_html() -> None:
    response = client.post(
        "/api/greetings",
        json={"name": "<b>Ana</b>", "message": "Hola <script>alert(1)</script> feliz día"},
    )
    assert response.status_code == 201
    assert "<" not in response.json()["name"]
    assert "<script>" not in response.json()["message"]


def test_create_greeting_rejects_empty_message() -> None:
    response = client.post("/api/greetings", json={"name": "Ana", "message": "   "})
    assert response.status_code == 422


def test_create_greeting_rejects_too_long_message() -> None:
    response = client.post("/api/greetings", json={"name": "Ana", "message": "x" * 600})
    assert response.status_code == 422


def test_list_greetings() -> None:
    client.post("/api/greetings", json={"name": "Ana", "message": "Que cumplas muchos años."})
    response = client.get("/api/greetings")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == len(payload["items"]) == 1


def test_get_greeting_not_found() -> None:
    response = client.get("/api/greetings/999999")
    assert response.status_code == 404


def test_rate_limit_blocks_excess_requests() -> None:
    settings = get_settings()
    payload = {"name": "Ana", "message": "Feliz día para ti."}
    statuses = [
        client.post("/api/greetings", json=payload).status_code
        for _ in range(settings.rate_limit_max_requests + 3)
    ]
    assert 429 in statuses
