"""FastAPI app for Vercel serverless deployment."""
from __future__ import annotations

import asyncio
import datetime as dt
import json
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    XAI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    ALLOWED_DOMAIN: str = "yourdomain.com"
    JWT_SECRET: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite:///./pulse.db"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()


# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    pass


# Handle Vercel Postgres URL format
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# On Vercel the filesystem is read-only except for /tmp
if "sqlite" in db_url and os.getenv("VERCEL"):
    db_url = "sqlite:////tmp/pulse.db"

engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, default="")
    created_at = Column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc))

    runs = relationship("Run", back_populates="user")


class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=False)
    days_back = Column(Integer, nullable=False, default=30)
    sources = Column(String, nullable=False, default="auto")
    depth = Column(String, nullable=False, default="default")
    status = Column(String, nullable=False, default="running")
    result_json = Column(Text, default=None)
    reddit_count = Column(Integer, default=0)
    x_count = Column(Integer, default=0)
    error = Column(Text, default=None)
    created_at = Column(DateTime, default=lambda: dt.datetime.now(dt.timezone.utc))
    completed_at = Column(DateTime, default=None)

    user = relationship("User", back_populates="runs")


_tables_created = False


def _ensure_tables():
    """Create tables on first use, not at import time."""
    global _tables_created
    if not _tables_created:
        try:
            Base.metadata.create_all(bind=engine)
            _tables_created = True
        except Exception:
            pass  # DB might not be ready yet; will fail at query time with a clear error


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7
_bearer = HTTPBearer(auto_error=False)


def verify_google_token(token: str) -> dict | None:
    try:
        return google_id_token.verify_oauth2_token(
            token, GoogleRequest(), settings.GOOGLE_CLIENT_ID
        )
    except Exception:
        return None


def check_domain(email: str) -> bool:
    if not settings.ALLOWED_DOMAIN:
        return True
    return email.endswith("@" + settings.ALLOWED_DOMAIN)


def create_jwt(user_id: int, email: str) -> str:
    expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        settings.JWT_SECRET,
        algorithm=ALGORITHM,
    )


def decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────────────────────


def get_db():
    _ensure_tables()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No credentials")
    payload = decode_jwt(creds.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ─────────────────────────────────────────────────────────────────────────────
# Research service
# ─────────────────────────────────────────────────────────────────────────────

# Add last30days-skill to path
_SKILL_SCRIPTS = Path(__file__).resolve().parent.parent / "last30days-skill" / "scripts"
if str(_SKILL_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SKILL_SCRIPTS))


def execute_research(
    topic: str,
    days_back: int = 30,
    sources: str = "auto",
    depth: str = "default",
    openai_key: str = "",
    xai_key: str = "",
) -> dict:
    """Run the full research pipeline and return report dict."""
    from last30days import run_research
    from lib import dates, dedupe, models, normalize, render, schema, score

    config = {
        "OPENAI_API_KEY": openai_key,
        "XAI_API_KEY": xai_key,
        "OPENAI_MODEL_POLICY": "auto",
        "OPENAI_MODEL_PIN": None,
        "XAI_MODEL_POLICY": "latest",
        "XAI_MODEL_PIN": None,
    }

    if sources == "auto":
        has_openai = bool(config.get("OPENAI_API_KEY"))
        has_xai = bool(config.get("XAI_API_KEY"))
        if has_openai and has_xai:
            sources = "both"
        elif has_openai:
            sources = "reddit"
        elif has_xai:
            sources = "x"
        else:
            raise ValueError("No API keys configured")

    selected_models = models.get_models(config)
    from_date, to_date = dates.get_date_range(days_back)

    reddit_items, x_items, _web_needed, raw_openai, raw_xai, _raw_enriched, reddit_error, x_error = run_research(
        topic, sources, config, selected_models, from_date, to_date, depth=depth
    )

    normalized_reddit = normalize.normalize_reddit_items(reddit_items, from_date, to_date)
    normalized_x = normalize.normalize_x_items(x_items, from_date, to_date)
    filtered_reddit = normalize.filter_by_date_range(normalized_reddit, from_date, to_date)
    filtered_x = normalize.filter_by_date_range(normalized_x, from_date, to_date)
    scored_reddit = score.score_reddit_items(filtered_reddit)
    scored_x = score.score_x_items(filtered_x)
    sorted_reddit = score.sort_items(scored_reddit)
    sorted_x = score.sort_items(scored_x)
    deduped_reddit = dedupe.dedupe_reddit(sorted_reddit)
    deduped_x = dedupe.dedupe_x(sorted_x)

    mode_map = {"both": "both", "reddit": "reddit-only", "x": "x-only", "all": "all"}
    mode = mode_map.get(sources, sources)

    report = schema.create_report(
        topic, from_date, to_date, mode,
        selected_models.get("openai"),
        selected_models.get("xai"),
    )
    report.reddit = deduped_reddit
    report.x = deduped_x
    report.reddit_error = reddit_error
    report.x_error = x_error
    report.context_snippet_md = render.render_context_snippet(report)

    return report.to_dict()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────


class GoogleTokenRequest(BaseModel):
    token: str


class AuthResponse(BaseModel):
    access_token: str
    user: dict


class MeResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: str


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


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Pulse API")

# CORS - allow frontend origins
origins = [settings.FRONTEND_URL]
if os.getenv("VERCEL_URL"):
    origins.append(f"https://{os.getenv('VERCEL_URL')}")
if os.getenv("VERCEL_PROJECT_PRODUCTION_URL"):
    origins.append(f"https://{os.getenv('VERCEL_PROJECT_PRODUCTION_URL')}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Routes: Auth
# ─────────────────────────────────────────────────────────────────────────────


@app.post("/api/auth/google", response_model=AuthResponse)
def google_login(body: GoogleTokenRequest, db: Session = Depends(get_db)):
    payload = verify_google_token(body.token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    email = payload.get("email", "")
    if not check_domain(email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Domain not allowed")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            name=payload.get("name", email),
            picture=payload.get("picture", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_jwt(user.id, user.email)
    return {
        "access_token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture},
    }


@app.get("/api/auth/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture}


# ─────────────────────────────────────────────────────────────────────────────
# Routes: Research
# ─────────────────────────────────────────────────────────────────────────────


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


@app.post("/api/research", response_model=RunResponse)
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


@app.get("/api/research/{run_id}", response_model=RunResponse)
def get_research(
    run_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(Run).filter(Run.id == run_id, Run.user_id == user.id).first()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return _run_to_response(run)


# ─────────────────────────────────────────────────────────────────────────────
# Routes: History
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/history", response_model=HistoryResponse)
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


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/health")
def health():
    return {"status": "ok"}
