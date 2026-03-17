"""Password hashing utilities using Argon2."""
from passlib.context import CryptContext

# Configure Argon2 with appropriate parameters
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain text password using Argon2."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)
