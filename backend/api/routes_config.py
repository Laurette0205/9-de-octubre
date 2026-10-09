"""Rutas de configuración pública del proyecto."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.schemas.config import ConfigOut
from backend.services import config_service

router = APIRouter(prefix="/api/config", tags=["configuración"])


@router.get("", response_model=ConfigOut, summary="Configuración pública")
def public_config() -> ConfigOut:
    try:
        payload = config_service.get_public_config()
    except config_service.ConfigError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return ConfigOut(**payload)


@router.get("/validate", summary="Validar campos obligatorios")
def validate() -> dict:
    try:
        config = config_service.load_config()
    except config_service.ConfigError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    missing = config_service.validate_required_fields(config)
    return {
        "valid": not missing,
        "missing": missing,
        "checkedAt": len(config),
    }
