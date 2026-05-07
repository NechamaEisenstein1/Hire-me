import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app.core.config import Settings
from app.services import ai_chat_service
from app.services.ai_chat_service import (
    AIProviderResponseError,
    AIServiceConfigurationError,
    answer_interview_question,
)


def build_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_secret_key": "test-secret-key",
        "database_url": "postgresql+asyncpg://user:pass@localhost:5432/hire_me_test",
        "ai_provider": "gemini",
        "gemini_api_key": "gemini-test-key",
        "gemini_model": "gemini-2.5-flash",
        "gemini_base_url": "https://generativelanguage.googleapis.com",
        "ai_request_timeout_seconds": 5,
        "ai_system_prompt": "Test system prompt.",
    }
    values.update(overrides)
    return Settings(**values)


def test_answer_interview_question_rejects_unsupported_provider() -> None:
    settings = SimpleNamespace(ai_provider="unsupported")

    with pytest.raises(AIServiceConfigurationError, match="Unsupported AI provider"):
        asyncio.run(answer_interview_question("Hello", settings=settings))


def test_answer_interview_question_rejects_invalid_provider_payload() -> None:
    settings = build_settings()

    async def run_test() -> None:
        transport = httpx.MockTransport(
            lambda _: httpx.Response(
                200,
                json={"candidates": [{"content": {"parts": [{"text": ""}]}}]},
            )
        )
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(AIProviderResponseError, match="empty response"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())


def test_answer_interview_question_rejects_unexpected_gemini_json_structure() -> None:
    settings = build_settings()

    async def run_test() -> None:
        transport = httpx.MockTransport(lambda _: httpx.Response(200, json=["bad-shape"]))
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(AIProviderResponseError, match="unexpected JSON structure"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())


def test_answer_interview_question_uses_gemini_generate_content_api() -> None:
    settings = build_settings(ai_provider="gemini")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == (
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        )
        assert request.headers["x-goog-api-key"] == "gemini-test-key"

        payload = json.loads(request.content.decode())
        assert payload["generationConfig"]["temperature"] == 0.2
        assert payload["contents"][0]["parts"][0]["text"] == "Tell me about your strengths."

        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": "Gemini answer"}
                            ]
                        }
                    }
                ]
            },
        )

    async def run_test() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            answer = await answer_interview_question(
                "Tell me about your strengths.",
                settings=settings,
                client=client,
            )

        assert answer == "Gemini answer"

    asyncio.run(run_test())


def test_answer_interview_question_requires_gemini_api_key() -> None:
    settings = build_settings(ai_provider="gemini", gemini_api_key="")

    async def run_test() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(200))) as client:
            with pytest.raises(AIServiceConfigurationError, match="GEMINI_API_KEY"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())


def test_answer_interview_question_retries_transient_gemini_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = build_settings()
    attempts = 0

    async def no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr(ai_chat_service.asyncio, "sleep", no_sleep)

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1

        if attempts == 1:
            return httpx.Response(503, json={"error": {"message": "busy"}})

        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "Recovered answer"}]
                        }
                    }
                ]
            },
        )

    async def run_test() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            answer = await answer_interview_question(
                "Tell me about your strengths.",
                settings=settings,
                client=client,
            )

        assert answer == "Recovered answer"
        assert attempts == 2

    asyncio.run(run_test())