from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.rest.chat import router
from app.services.ai_chat_service import (
    AIProviderRequestError,
    AIProviderResponseError,
    AIServiceConfigurationError,
)


def create_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_chat_route_rejects_blank_questions() -> None:
    client = create_client()

    response = client.post("/api/v1/chat/messages", json={"question": "   "})

    assert response.status_code == 422


def test_chat_route_returns_503_for_configuration_errors() -> None:
    client = create_client()

    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIServiceConfigurationError("Missing AI configuration.")),
    ):
        response = client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Missing AI configuration."


def test_chat_route_returns_503_for_provider_request_errors() -> None:
    client = create_client()

    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIProviderRequestError("Unable to reach provider.")),
    ):
        response = client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to reach provider."


def test_chat_route_returns_502_for_provider_response_errors() -> None:
    client = create_client()

    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(side_effect=AIProviderResponseError("Provider returned bad data.")),
    ):
        response = client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Provider returned bad data."


def test_chat_route_returns_200_and_chat_response_on_success() -> None:
    client = create_client()
    expected_answer = "This is a test answer."

    with patch(
        "app.api.rest.chat.answer_interview_question",
        new=AsyncMock(return_value=expected_answer),
    ):
        response = client.post("/api/v1/chat/messages", json={"question": "Hello"})

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body.get("answer") == expected_answer