from __future__ import annotations

import datetime as dt

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt

from .config import settings

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7


def verify_google_token(token: str) -> dict | None:
    """Verify a Google ID token and return the payload, or None."""
    import sys
    print(f"DEBUG: Verifying token with client_id={settings.GOOGLE_CLIENT_ID}", file=sys.stderr, flush=True)
    try:
        payload = google_id_token.verify_oauth2_token(
            token, GoogleRequest(), settings.GOOGLE_CLIENT_ID
        )
        print(f"DEBUG: Token verified successfully for {payload.get('email')}", file=sys.stderr, flush=True)
        return payload
    except Exception as e:
        print(f"DEBUG: Google token verification failed: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
        return None


def check_domain(email: str) -> bool:
    return email.endswith("@" + settings.ALLOWED_DOMAIN)


def create_jwt(user_id: int, email: str) -> str:
    expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        settings.JWT_SECRET,
        algorithm=ALGORITHM,
    )


def decode_jwt(token: str) -> dict | None:
    import sys
    try:
        result = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        print(f"DEBUG: JWT decoded successfully: {result}", file=sys.stderr, flush=True)
        return result
    except JWTError as e:
        print(f"DEBUG: JWT decode failed: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
        return None
