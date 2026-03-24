from typing import Callable, cast

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.responses import Response

from app.api.graphql.schema import graphql_router
from app.api.rest.auth import router as auth_router
from app.api.rest.chat import router as chat_router
from app.api.rest.github import router as github_router
from app.api.rest.health import router as health_router
from app.api.rest.projects import router as projects_router
from app.api.rest.resume_profile import router as resume_profile_router
from app.api.ws.visitors import router as visitors_ws_router
from app.core.config import get_settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Register rate limit exceeded exception handler
rate_limit_handler = cast(
    Callable[[Request, Exception], Response],
    rate_limit_exceeded_handler,
)
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(resume_profile_router)
app.include_router(projects_router)
app.include_router(github_router)
app.include_router(graphql_router, prefix="/graphql")
app.include_router(visitors_ws_router)
