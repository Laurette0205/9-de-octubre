"""Aplicación FastAPI: API REST opcional + servido del frontend.

Ejecutar desde la raíz del proyecto:
    uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.api import routes_config, routes_greetings, routes_health
from backend.config.settings import CONFIG_FILE, DIST_DIR, get_settings
from backend.core.security import SecurityHeadersMiddleware

logger = logging.getLogger("backend")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

settings = get_settings()

app = FastAPI(
    title="9 de Octubre — API",
    description="API opcional de la experiencia de cumpleaños: configuración pública y saludos.",
    version="1.0.0",
    docs_url="/api/docs" if settings.environment != "production" else None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None,
)

app.add_middleware(SecurityHeadersMiddleware, enable_hsts=settings.force_https)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exception: Exception) -> JSONResponse:  # noqa: ANN001
    logger.exception("Error no controlado en %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor."})


app.include_router(routes_health.router)
app.include_router(routes_config.router)
app.include_router(routes_greetings.router)


@app.get("/api", tags=["raíz"])
def api_root() -> dict:
    return {
        "service": settings.app_name,
        "endpoints": ["/api/health", "/api/config", "/api/config/validate", "/api/greetings"],
        "docs": "/api/docs" if settings.environment != "production" else None,
    }


@app.get("/birthday.config.json", tags=["configuración"], summary="Archivo de configuración")
def config_file() -> FileResponse:
    """Sirve la configuración central para que el frontend pueda editarla en caliente."""
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(CONFIG_FILE)
    return FileResponse(CONFIG_FILE, media_type="application/json")


if settings.serve_frontend and Path(DIST_DIR).exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
