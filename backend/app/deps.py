from __future__ import annotations

import sys
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .auth import decode_jwt
from .database import SessionLocal
from .models import User

_bearer = HTTPBearer(auto_error=False)


def get_db():
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
    auth_header = request.headers.get("Authorization", "MISSING")
    print(f"DEBUG: Auth header: {auth_header[:80] if len(auth_header) > 80 else auth_header}", file=sys.stderr, flush=True)

    if creds is None:
        print(f"DEBUG: No credentials extracted", file=sys.stderr, flush=True)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No credentials")

    print(f"DEBUG: Token received: {creds.credentials[:50]}...", file=sys.stderr, flush=True)
    payload = decode_jwt(creds.credentials)
    print(f"DEBUG: Decoded payload: {payload}", file=sys.stderr, flush=True)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
