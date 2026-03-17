from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import create_access_token, create_refresh_token, verify_token
from app.core.password import verify_password
from app.db.repositories.users_repo import UsersRepository
from app.db.session import get_db_session
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserRead,
    UserRegister,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
async def register(
    payload: UserRegister, session: AsyncSession = Depends(get_db_session)
) -> UserRead:
    """Register a new user with email and password."""
    repo = UsersRepository(session)
    existing_user = await repo.get_user_by_email(payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    user = await repo.create_user(email=payload.email, password=payload.password)
    return UserRead(
        id=user.id,
        email=user.email,
        role=user.role,
        created_at=str(user.created_at),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest, session: AsyncSession = Depends(get_db_session)
) -> TokenResponse:
    """Authenticate user and return JWT access + refresh tokens."""
    repo = UsersRepository(session)
    user = await repo.get_user_by_email(payload.email)

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest) -> TokenResponse:
    """Exchange a refresh token for a new access token."""
    user_id = verify_token(payload.refresh_token, token_type="refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    access_token = create_access_token(subject=user_id)
    return TokenResponse(access_token=access_token, refresh_token=payload.refresh_token)
