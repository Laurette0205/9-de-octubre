"""Cliente de pruebas síncrono e independiente de versiones.

starlette.testclient.TestClient depende del parámetro `app` de httpx (retirado
en httpx 0.28) y `httpx.ASGITransport` sólo funciona de forma asíncrona.
Este transporte mínimo ejecuta la aplicación ASGI con asyncio.run() y devuelve
respuestas httpx, con la misma superficie que usan las pruebas.
"""

from __future__ import annotations

import asyncio
from typing import Any, Callable

import httpx

__all__ = ["TestClient"]


class _SyncASGITransport(httpx.BaseTransport):
    def __init__(self, app: Callable) -> None:  # noqa: ANN001
        self.app = app

    def handle_request(self, request: httpx.Request) -> httpx.Response:  # noqa: N802
        body = request.read()
        messages: list[dict[str, Any]] = []

        async def run_app() -> None:
            scope: dict[str, Any] = {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": request.method,
                "scheme": request.url.scheme or "http",
                "path": request.url.path,
                "raw_path": request.url.path.encode("utf-8"),
                "query_string": request.url.query,
                "root_path": "",
                "headers": [(key.lower(), value) for key, value in request.headers.items()],
                "client": ("testclient", 50000),
                "server": ("testserver", 80),
            }

            request_sent = False
            response_complete = asyncio.Event()

            async def receive() -> dict[str, Any]:
                nonlocal request_sent
                if not request_sent:
                    request_sent = True
                    return {"type": "http.request", "body": body, "more_body": False}
                # Igual que starlette.testclient: sólo se informa del cierre
                # cuando la respuesta ha terminado (evita cortar el streaming).
                await response_complete.wait()
                return {"type": "http.disconnect"}

            async def send(message: dict[str, Any]) -> None:
                messages.append(message)
                if message["type"] == "http.response.body" and not message.get("more_body", False):
                    response_complete.set()

            await self.app(scope, receive, send)
            response_complete.set()

        asyncio.run(run_app())

        status = 500
        headers: list[tuple[bytes, bytes]] = []
        content = b""
        for message in messages:
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = message.get("headers", [])
            elif message["type"] == "http.response.body":
                content += message.get("body", b"") or b""

        return httpx.Response(status_code=status, headers=headers, content=content, request=request)


class TestClient:  # noqa: N801
    """Superficie mínima compatible con starlette.testclient.TestClient."""

    __test__ = False

    def __init__(self, app: Any) -> None:  # noqa: ANN401
        self._client = httpx.Client(
            transport=_SyncASGITransport(app),
            base_url="http://testserver",
        )

    def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._client.get(url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._client.post(url, **kwargs)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "TestClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
