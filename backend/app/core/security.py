from datetime import UTC, datetime, timedelta

from jose import jwt

from app.core.config import get_settings

settings = get_settings()


def create_access_token(subject: str) -> str:
    expires_delta = timedelta(minutes=settings.jwt_access_token_expires_minutes)
    expire = datetime.now(UTC) + expires_delta
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)
