"""Rutas de saludos con validación y límite de peticiones."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.config.settings import get_settings
from backend.core.security import RateLimiter, client_key
from backend.models.greeting import GreetingRepository
from backend.schemas.greeting import GreetingCreate, GreetingList, GreetingOut
from backend.services.greeting_service import GreetingService

router = APIRouter(prefix="/api/greetings", tags=["saludos"])

_limiter = RateLimiter(
    window_seconds=get_settings().rate_limit_window_seconds,
    max_requests=get_settings().rate_limit_max_requests,
)


def get_service() -> GreetingService:
    settings = get_settings()
    repository = GreetingRepository(settings.database_path)
    return GreetingService(repository, settings.max_greeting_length)


def enforce_rate_limit(request: Request) -> None:
    if not _limiter.allow(client_key(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas peticiones. Inténtalo en unos segundos.",
        )


@router.post(
    "",
    response_model=GreetingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un saludo",
    dependencies=[Depends(enforce_rate_limit)],
)
def create_greeting(payload: GreetingCreate, service: GreetingService = Depends(get_service)) -> GreetingOut:
    try:
        created = service.create(payload)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return GreetingOut(**created)


@router.get("", response_model=GreetingList, summary="Listar saludos")
def list_greetings(limit: int = 50, service: GreetingService = Depends(get_service)) -> GreetingList:
    items = service.list(limit)
    return GreetingList(items=[GreetingOut(**item) for item in items], total=len(items))


@router.get("/{greeting_id}", response_model=GreetingOut, summary="Obtener un saludo")
def get_greeting(greeting_id: int, service: GreetingService = Depends(get_service)) -> GreetingOut:
    item = service.get(greeting_id)
    if not item:
        raise HTTPException(status_code=404, detail="Saludo no encontrado.")
    return GreetingOut(**item)
