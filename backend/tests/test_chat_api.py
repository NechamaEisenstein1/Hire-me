from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import APIRouter

from app.api.rest.chat import router
from app.services.ai_chat_service import (
    AIProviderRequestError,
    AIProviderResponseError,
    AIServiceConfigurationError,
)

@pytest.fixture
def test_router() -> APIRouter:
    return router


@pytest.mark.anyio
async def test_chat_route_rejects_blank_questions(async_client: httpx.AsyncClient) -> None:
    response = await async_client.post("/api/v1/chat/messages", json={"question": "   "})
    assert response.status_code == 422


@pytest.mark.anyio
async def test_chat_route_returns_503_for_configuration_errors(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIServiceConfigurationError("Missing AI configuration.")),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Missing AI configuration."


@pytest.mark.anyio
async def test_chat_route_returns_503_for_provider_request_errors(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIProviderRequestError("Unable to reach provider.")),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to reach provider."


@pytest.mark.anyio
async def test_chat_route_returns_502_for_provider_response_errors(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIProviderResponseError("Provider returned bad data.")),
    ):
        response = await async_client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Provider returned bad data."


@pytest.mark.anyio
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