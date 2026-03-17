"""JWT token creation and verification utilities."""
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.core.config import get_settings


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token with 30-minute expiry by default."""
    settings = get_settings()
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_token_expires_minutes)
    
    expire = datetime.now(UTC) + expires_delta
    payload = {"sub": subject, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    """Create a JWT refresh token with 30-day expiry."""
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(days=30)
    payload = {"sub": subject, "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str, token_type: str = "access") -> str | None:
    """Verify a JWT token and return the subject (user ID) if valid."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.app_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        token_type_in_payload = payload.get("type", "access")
        
        if not subject:
            return None
        
        if token_type_in_payload != token_type:
            return None
        
        return subject
    except JWTError:
        return None
