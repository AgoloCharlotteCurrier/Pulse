from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import check_domain, create_jwt, verify_google_token
from ..deps import get_current_user, get_db
from ..models import User

router = APIRouter()


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


@router.post("/google", response_model=AuthResponse)
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


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture}
