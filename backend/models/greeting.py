"""Repositorio de saludos sobre SQLite (biblioteca estándar, sin ORM)."""

from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS greetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""

_INSERT = "INSERT INTO greetings (name, message, created_at) VALUES (?, ?, ?)"
_SELECT_ALL = "SELECT id, name, message, created_at FROM greetings ORDER BY id DESC LIMIT ?"
_SELECT_ONE = "SELECT id, name, message, created_at FROM greetings WHERE id = ?"
_COUNT = "SELECT COUNT(*) FROM greetings"


class GreetingRepository:
    """Acceso a datos aislado del resto de la aplicación (SRP)."""

    def __init__(self, database_path: Path) -> None:
        self.database_path = Path(database_path)
        self._lock = threading.Lock()
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.database_path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._lock, self._connect() as connection:
            connection.execute(SCHEMA)

    def create(self, name: str, message: str) -> dict:
        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._lock, self._connect() as connection:
            cursor = connection.execute(_INSERT, (name, message, created_at))
            greeting_id = cursor.lastrowid
        return {
            "id": int(greeting_id),
            "name": name,
            "message": message,
            "created_at": created_at,
        }

    def list(self, limit: int = 50) -> list[dict]:
        with self._lock, self._connect() as connection:
            rows = connection.execute(_SELECT_ALL, (limit,)).fetchall()
        return [dict(row) for row in rows]

    def get(self, greeting_id: int) -> dict | None:
        with self._lock, self._connect() as connection:
            row = connection.execute(_SELECT_ONE, (greeting_id,)).fetchone()
        return dict(row) if row else None

    def count(self) -> int:
        with self._lock, self._connect() as connection:
            row = connection.execute(_COUNT).fetchone()
        return int(row[0]) if row else 0
