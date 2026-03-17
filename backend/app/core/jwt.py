from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import get_settings

settings = get_settings()


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expires_minutes)
    expire = datetime.now(UTC) + expires_delta
    payload = {"sub": subject, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(UTC) + timedelta(days=30)
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str, token_type: str = "access") -> str | None:
    try:
        payload = jwt.decode(token, settings.app_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != token_type:
            return None
        subject = payload.get("sub")
        return subject
    except Exception:
        return None
