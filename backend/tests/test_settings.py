"""Pruebas de la configuración central del backend (variables de entorno)."""

from __future__ import annotations

from backend.config.settings import Settings, _cors_origins


def test_allowed_origins_is_the_canonical_env_var(monkeypatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://cumple.example, http://localhost:8099")
    assert _cors_origins() == ["https://cumple.example", "http://localhost:8099"]


def test_allowed_origins_wins_over_legacy_alias(monkeypatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://nuevo.example")
    monkeypatch.setenv("CORS_ORIGINS", "https://antiguo.example")
    assert _cors_origins() == ["https://nuevo.example"]


def test_origins_are_normalized_without_trailing_slash(monkeypatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://cumple.example/")
    assert _cors_origins() == ["https://cumple.example"]


def test_default_origins_when_env_is_missing(monkeypatch) -> None:
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert _cors_origins() == ["http://localhost:8099", "http://127.0.0.1:8099"]


def test_force_https_flag(monkeypatch) -> None:
    monkeypatch.setenv("FORCE_HTTPS", "true")
    assert Settings().force_https is True

    monkeypatch.setenv("FORCE_HTTPS", "0")
    assert Settings().force_https is False


def test_settings_ignore_unknown_keys() -> None:
    settings = Settings(unknown_key="ignored")  # type: ignore[call-arg]
    assert settings.environment in {"development", "production", "test", "staging"}
