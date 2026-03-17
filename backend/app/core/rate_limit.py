from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Initialize limiter with remote address key function
limiter = Limiter(key_func=get_remote_address)

# Custom rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle rate limit exceeded errors with proper 429 response."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. You have been rate limited."},
    )
