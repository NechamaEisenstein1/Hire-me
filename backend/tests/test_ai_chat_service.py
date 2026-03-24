import asyncio
import json
from types import SimpleNamespace

import httpx
import pytest

from app.core.config import Settings
from app.services.ai_chat_service import (
    AIProviderResponseError,
    AIServiceConfigurationError,
    answer_interview_question,
)


def build_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_secret_key": "test-secret-key",
        "database_url": "postgresql+asyncpg://user:pass@localhost:5432/hire_me_test",
        "ai_provider": "ollama",
        "groq_api_key": "groq-test-key",
        "groq_model": "llama-3.1-8b-instant",
        "ollama_base_url": "http://ollama.local:11434",
        "ollama_model": "llama3.1:8b",
        "ai_request_timeout_seconds": 5,
        "ai_system_prompt": "Test system prompt.",
    }
    values.update(overrides)
    return Settings(**values)


def test_answer_interview_question_uses_groq_chat_completions() -> None:
    settings = build_settings(ai_provider="groq")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == "https://api.groq.com/openai/v1/chat/completions"
        assert request.headers["Authorization"] == "Bearer groq-test-key"

        payload = json.loads(request.content.decode())
        assert payload["model"] == "llama-3.1-8b-instant"
        assert payload["messages"][1]["content"] == "Tell me about system design."

        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "Groq answer"}}]},
        )

    async def run_test() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            answer = await answer_interview_question(
                "Tell me about system design.",
                settings=settings,
                client=client,
            )

        assert answer == "Groq answer"

    asyncio.run(run_test())


def test_answer_interview_question_uses_ollama_chat_api() -> None:
    settings = build_settings()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == "http://ollama.local:11434/api/chat"

        payload = json.loads(request.content.decode())
        assert payload["model"] == "llama3.1:8b"
        assert payload["stream"] is False
        assert payload["messages"][1]["content"] == "Summarize your architecture choices."

        return httpx.Response(
            200,
            json={"message": {"content": "Ollama answer"}},
        )

    async def run_test() -> None:
        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            answer = await answer_interview_question(
                "Summarize your architecture choices.",
                settings=settings,
                client=client,
            )

        assert answer == "Ollama answer"

    asyncio.run(run_test())


def test_answer_interview_question_requires_groq_api_key() -> None:
    settings = build_settings(ai_provider="groq", groq_api_key="")

    async def run_test() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(200))) as client:
            with pytest.raises(AIServiceConfigurationError, match="GROQ_API_KEY"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())


def test_answer_interview_question_rejects_unsupported_provider() -> None:
    settings = SimpleNamespace(ai_provider="unsupported")

    with pytest.raises(AIServiceConfigurationError, match="Unsupported AI provider"):
        asyncio.run(answer_interview_question("Hello", settings=settings))


def test_answer_interview_question_rejects_invalid_provider_payload() -> None:
    settings = build_settings()

    async def run_test() -> None:
        transport = httpx.MockTransport(lambda _: httpx.Response(200, json={"message": {"content": ""}}))
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(AIProviderResponseError, match="empty response"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())


def test_answer_interview_question_rejects_unexpected_groq_json_structure() -> None:
    settings = build_settings(ai_provider="groq")

    async def run_test() -> None:
        transport = httpx.MockTransport(lambda _: httpx.Response(200, json=["bad-shape"]))
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(AIProviderResponseError, match="unexpected JSON structure"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())


def test_answer_interview_question_rejects_unexpected_ollama_json_structure() -> None:
    settings = build_settings()

    async def run_test() -> None:
        transport = httpx.MockTransport(lambda _: httpx.Response(200, json=["bad-shape"]))
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(AIProviderResponseError, match="unexpected response format"):
                await answer_interview_question("Hello", settings=settings, client=client)

    asyncio.run(run_test())