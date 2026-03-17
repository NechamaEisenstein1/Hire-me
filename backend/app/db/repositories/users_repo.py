"""Repository for user data access operations."""
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.password import hash_password
from app.db.models.user import User


class UsersRepository:
    """Handle all user database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user_by_email(self, email: str) -> User | None:
        """Fetch a user by email address."""
        query = select(User).where(User.email == email)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> User | None:
        """Fetch a user by ID."""
        query = select(User).where(User.id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, email: str, password: str) -> User:
        """Create a new user with hashed password."""
        hashed_password = hash_password(password)
        user = User(email=email, password_hash=hashed_password, role="viewer")
        self.session.add(user)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ValueError("Email already registered") from exc
        await self.session.refresh(user)
        return user

    async def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """List all users with pagination."""
        query = select(User).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update_user(self, user_id: int, **kwargs) -> User | None:
        """Update user fields."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        for key, value in kwargs.items():
            if hasattr(user, key) and key != "id":
                setattr(user, key, value)

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete_user(self, user_id: int) -> bool:
        """Delete a user by ID."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        self.session.delete(user)
        await self.session.commit()
        return True
