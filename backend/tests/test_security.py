"""Pruebas de seguridad: cabeceras, sanitización y utilidades."""

from __future__ import annotations

from backend.tests._client import TestClient
from starlette.requests import Request

from backend.core.security import RateLimiter, SecurityHeadersMiddleware, client_key, sanitize_text
from backend.main import app

client = TestClient(app)


def test_security_headers_present() -> None:
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]


def test_csp_has_no_external_origins() -> None:
    """Todo se autoaloja: ni estilos, ni fuentes, ni conexiones fuera de 'self'.

    Regresión del error «sw.js violates connect-src 'self'» que aparecía cuando
    el service worker intentaba cachear las tipografías de Google.
    """
    response = client.get("/api/health")
    csp = response.headers["Content-Security-Policy"]
    assert "fonts.googleapis.com" not in csp
    assert "fonts.gstatic.com" not in csp
    assert "style-src 'self' 'unsafe-inline';" in csp
    assert "font-src 'self';" in csp
    assert "connect-src 'self';" in csp


def test_sanitize_text_removes_tags_and_control_chars() -> None:
    dirty = "Hola\u0000 <b> mundo </b>   \n  fin"
    clean = sanitize_text(dirty)
    assert "<" not in clean and ">" not in clean
    assert "\u0000" not in clean
    assert "  " not in clean
    assert clean == "Hola mundo fin"


def test_sanitize_text_limits_length() -> None:
    assert len(sanitize_text("a" * 1000, max_length=50)) == 50


def test_rate_limiter_window() -> None:
    limiter = RateLimiter(window_seconds=60, max_requests=2)
    assert limiter.allow("ip-1") is True
    assert limiter.allow("ip-1") is True
    assert limiter.allow("ip-1") is False
    assert limiter.allow("ip-2") is True
    limiter.reset()
    assert limiter.allow("ip-1") is True


def test_client_key_prefers_forwarded_header() -> None:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"x-forwarded-for", b"203.0.113.7, 10.0.0.1")],
        "client": ("127.0.0.1", 1234),
    }
    request = Request(scope)
    assert client_key(request) == "203.0.113.7"


async def _dummy_app(scope, receive, send):  # noqa: ANN001, ANN202
    """Aplicación ASGI mínima que responde 200 con cuerpo vacío."""
    await receive()
    await send({"type": "http.response.start", "status": 200, "headers": [(b"content-length", b"0")]})
    await send({"type": "http.response.body", "body": b""})


def test_hsts_is_absent_by_default() -> None:
    client = TestClient(SecurityHeadersMiddleware(_dummy_app))
    response = client.get("/health")
    assert "Strict-Transport-Security" not in response.headers


def test_hsts_is_emitted_when_enabled() -> None:
    client = TestClient(SecurityHeadersMiddleware(_dummy_app, enable_hsts=True))
    response = client.get("/health")
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
    # El resto de cabeceras sigue presente
    assert response.headers["X-Content-Type-Options"] == "nosniff"
