from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import Run, User

router = APIRouter()


class HistoryItem(BaseModel):
    id: int
    topic: str
    days_back: int
    sources: str
    depth: str
    status: str
    reddit_count: int
    x_count: int
    error: str | None = None
    created_at: str
    completed_at: str | None = None


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    page: int
    per_page: int


@router.get("", response_model=HistoryResponse)
def list_history(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Run).filter(Run.user_id == user.id).order_by(Run.created_at.desc())
    total = q.count()
    runs = q.offset((page - 1) * per_page).limit(per_page).all()

    items = [
        {
            "id": r.id,
            "topic": r.topic,
            "days_back": r.days_back,
            "sources": r.sources,
            "depth": r.depth,
            "status": r.status,
            "reddit_count": r.reddit_count,
            "x_count": r.x_count,
            "error": r.error,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in runs
    ]

    return {"items": items, "total": total, "page": page, "per_page": per_page}
