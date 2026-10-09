"""Pruebas del endpoint de salud y de la raíz de la API."""

from __future__ import annotations

from backend.tests._client import TestClient

from backend.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"]
    assert payload["timestamp"]


def test_api_root_lists_endpoints() -> None:
    response = client.get("/api")
    assert response.status_code == 200
    assert "/api/config" in response.json()["endpoints"]


def test_unknown_api_route_returns_404() -> None:
    response = client.get("/api/que-no-existe")
    assert response.status_code == 404
