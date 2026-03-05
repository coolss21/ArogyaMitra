"""User memory read/write helpers backed by the user_memory table."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.models import UserMemory


def get_memory(user_id: str, db: Session) -> dict[str, str]:
    rows = db.query(UserMemory).filter(UserMemory.user_id == user_id).all()
    return {r.key: r.value for r in rows}


def set_memory(user_id: str, key: str, value: str, db: Session) -> None:
    existing = db.query(UserMemory).filter(
        UserMemory.user_id == user_id,
        UserMemory.key == key,
    ).first()
    if existing:
        existing.value = value
    else:
        db.add(UserMemory(user_id=user_id, key=key, value=value))
    db.commit()


def delete_memory_key(user_id: str, key: str, db: Session) -> bool:
    row = db.query(UserMemory).filter(
        UserMemory.user_id == user_id, UserMemory.key == key
    ).first()
    if row:
        db.delete(row)
        db.commit()
        return True
    return False
