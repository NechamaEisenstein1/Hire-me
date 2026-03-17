from fastapi import APIRouter, HTTPException, status

from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    # Placeholder auth flow for initial scaffold.
    if payload.email == "admin@example.com" and payload.password == "admin123":
        return TokenResponse(access_token=create_access_token(subject=payload.email))
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
