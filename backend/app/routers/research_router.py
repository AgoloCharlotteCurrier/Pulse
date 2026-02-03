from __future__ import annotations

import asyncio
import datetime as dt
import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_current_user, get_db
from ..models import Run, User
from ..research_service import execute_research

router = APIRouter()


class ResearchRequest(BaseModel):
    topic: str
    days_back: int = Field(default=30, ge=1, le=90)
    sources: str = Field(default="auto", pattern="^(auto|reddit|x|both)$")
    depth: str = Field(default="default", pattern="^(quick|default|deep)$")


class RunResponse(BaseModel):
    id: int
    topic: str
    days_back: int
    sources: str
    depth: str
    status: str
    result: dict | None = None
    reddit_count: int
    x_count: int
    error: str | None = None
    created_at: str
    completed_at: str | None = None


def _run_to_response(run: Run) -> dict:
    return {
        "id": run.id,
        "topic": run.topic,
        "days_back": run.days_back,
        "sources": run.sources,
        "depth": run.depth,
        "status": run.status,
        "result": json.loads(run.result_json) if run.result_json else None,
        "reddit_count": run.reddit_count,
        "x_count": run.x_count,
        "error": run.error,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


@router.post("", response_model=RunResponse)
async def create_research(
    body: ResearchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = Run(
        user_id=user.id,
        topic=body.topic,
        days_back=body.days_back,
        sources=body.sources,
        depth=body.depth,
        status="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        result = await asyncio.to_thread(
            execute_research,
            topic=body.topic,
            days_back=body.days_back,
            sources=body.sources,
            depth=body.depth,
            openai_key=settings.OPENAI_API_KEY,
            xai_key=settings.XAI_API_KEY,
        )
        run.status = "completed"
        run.result_json = json.dumps(result)
        run.reddit_count = len(result.get("reddit", []))
        run.x_count = len(result.get("x", []))
        run.completed_at = dt.datetime.now(dt.timezone.utc)
    except Exception as exc:
        run.status = "failed"
        run.error = str(exc)
        run.completed_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(run)
    return _run_to_response(run)


@router.get("/{run_id}", response_model=RunResponse)
def get_research(
    run_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.user_id == user.id).first()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return _run_to_response(run)
