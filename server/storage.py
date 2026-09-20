"""Local SQLite storage for study sets."""
import json
import sqlite3
from pathlib import Path


DB_PATH = Path.home() / ".history-hub" / "study-sets.sqlite3"


def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=30)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("""
        CREATE TABLE IF NOT EXISTS study_sets (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )
    """)
    return db


def get_all_sets() -> list[dict]:
    with connect() as db:
        rows = db.execute("SELECT data FROM study_sets ORDER BY rowid DESC").fetchall()
    return [json.loads(row[0]) for row in rows]


def get_set(set_id: str) -> dict | None:
    with connect() as db:
        row = db.execute("SELECT data FROM study_sets WHERE id = ?", (set_id,)).fetchone()
    return json.loads(row[0]) if row else None


def save_set(data: dict) -> dict:
    with connect() as db:
        db.execute(
            "INSERT INTO study_sets (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
            (data["id"], json.dumps(data))
        )
    return data


def delete_set(set_id: str) -> bool:
    with connect() as db:
        cursor = db.execute("DELETE FROM study_sets WHERE id = ?", (set_id,))
    return cursor.rowcount > 0
