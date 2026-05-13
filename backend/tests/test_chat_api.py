from typing import cast
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import APIRouter, FastAPI
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.rest.chat import router
from app.core.config import get_settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.services.ai_chat_service import (
    AIProviderRequestError,
    AIProviderResponseError,
    AIServiceConfigurationError,
)


@pytest.fixture
def test_router() -> APIRouter:
    return router


@pytest.fixture
async def rate_limited_client() -> httpx.AsyncClient:
    """FastAPI app wired with SlowAPI middleware so rate limiting is enforced.

    Swaps the limiter's storage with a fresh instance (on both the Limiter
    and the underlying FixedWindowRateLimiter) so counters accumulated by
    other tests do not bleed into this fixture's request window.
    """
    fresh_storage = type(limiter._storage)()
    original_storage = limiter._storage
    limiter._storage = fresh_storage
    limiter._limiter.storage = fresh_storage
    try:
        app = FastAPI()
        app.state.limiter = limiter
        app.add_middleware(SlowAPIMiddleware)
        app.add_exception_handler(
            RateLimitExceeded,
            cast(  # type: ignore[arg-type]
                type[Exception],
                rate_limit_exceeded_handler,
            ),
        )
        app.include_router(router)
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        limiter._storage = original_storage
        limiter._limiter.storage = original_storage


@pytest.mark.asyncio
async def test_chat_route_rejects_blank_questions(async_client: httpx.AsyncClient) -> None:
    response = await async_client.post("/api/v1/chat/messages", json={"question": "   "})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_route_returns_503_for_configuration_errors(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIServiceConfigurationError("Missing AI configuration.")),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Missing AI configuration."


@pytest.mark.asyncio
async def test_chat_route_returns_503_for_provider_request_errors(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIProviderRequestError("Unable to reach provider.")),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to reach provider."


@pytest.mark.asyncio
async def test_chat_route_returns_502_for_provider_response_errors(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIProviderResponseError("Provider returned bad data.")),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Provider returned bad data."


@pytest.mark.asyncio
async def test_chat_route_returns_200_and_chat_response_on_success(async_client: httpx.AsyncClient) -> None:
    expected_answer = "This is a test answer."

    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(return_value=expected_answer),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body.get("answer") == expected_answer


@pytest.mark.asyncio
async def test_chat_route_returns_429_after_daily_limit_exceeded(
    rate_limited_client: httpx.AsyncClient,
) -> None:
    """Exhaust the configured daily limit then verify the next call is rejected."""
    limit = get_settings().chat_daily_limit
    expected_detail = (
        "You have reached the daily message limit. "
        "Please try again tomorrow. | "
        "הגעת למגבלת ההודעות היומית. אפשר לנסות שוב מחר."
    )

    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(return_value="ok"),
    ):
        for _ in range(limit):
            resp = await rate_limited_client.post(
                "/api/v1/chat/messages", json={"question": "Hello"}
            )
            assert resp.status_code == 200

        over_limit = await rate_limited_client.post(
            "/api/v1/chat/messages", json={"question": "Hello"}
        )

    assert over_limit.status_code == 429
    assert over_limit.json()["detail"] == expected_detail
