"""Configuración centralizada del backend (variables de entorno)."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

BASE_DIR = Path(__file__).resolve().parents[2]
# Salida de `npm run build` (Vite): la raíz estática es dist/.
DIST_DIR = BASE_DIR / "dist"
CONFIG_FILE = BASE_DIR / "public" / "birthday.config.json"
DEFAULT_DATABASE = BASE_DIR / "backend" / "data" / "greetings.db"


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _load_dotenv(path: Path) -> None:
    """Carga un .env sencillo sin añadir dependencias (KEY=VALUE)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv(BASE_DIR / "backend" / ".env")


def _env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name)
    if raw and raw.strip():
        return Path(raw.strip()).expanduser()
    return default


def _cors_origins() -> list[str]:
    """Orígenes permitidos.

    `ALLOWED_ORIGINS` es el nombre canónico (documentado en despliegues);
    `CORS_ORIGINS` se mantiene como alias para no romper configuraciones previas.
    """
    raw = (
        os.getenv("ALLOWED_ORIGINS")
        or os.getenv("CORS_ORIGINS")
        or "http://localhost:8099,http://127.0.0.1:8099"
    )
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


class Settings(BaseModel):
    """Ajustes de ejecución. Ningún valor sensible vive en el código."""

    app_name: str = Field(default="9 de Octubre API")
    environment: str = Field(default=os.getenv("ENVIRONMENT", "development"))
    debug: bool = Field(default=_env_bool("DEBUG", False))

    host: str = Field(default=os.getenv("HOST", "127.0.0.1"))
    port: int = Field(default=int(os.getenv("PORT", "8000")))

    database_path: Path = Field(default_factory=lambda: _env_path("DATABASE_PATH", DEFAULT_DATABASE))

    cors_origins: list[str] = Field(default_factory=_cors_origins)

    # Activa HSTS cuando el TLS lo termina un proxy inverso delante de Uvicorn.
    force_https: bool = Field(default_factory=lambda: _env_bool("FORCE_HTTPS", False))

    serve_frontend: bool = Field(default=_env_bool("SERVE_FRONTEND", True))
    max_greeting_length: int = 500
    rate_limit_window_seconds: int = 60
    rate_limit_max_requests: int = 12

    model_config = ConfigDict(extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
