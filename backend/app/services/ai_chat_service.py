from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings, get_settings

GROQ_CHAT_COMPLETIONS_PATH = "/openai/v1/chat/completions"
OLLAMA_CHAT_PATH = "/api/chat"


class AIServiceError(Exception):
    pass


class AIServiceConfigurationError(AIServiceError):
    pass


class AIProviderRequestError(AIServiceError):
    pass


class AIProviderResponseError(AIServiceError):
    pass


def _build_messages(
    question: str,
    settings: Settings,
    *,
    profile_context: str = "",
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [
        {"role": "system", "content": settings.ai_system_prompt},
    ]

    if profile_context.strip():
        messages.append({"role": "system", "content": profile_context.strip()})

    messages.append({"role": "user", "content": question.strip()})
    return messages


def _extract_text_content(content: Any) -> str:
    if isinstance(content, str):
        answer = content.strip()
        if answer:
            return answer
        raise AIProviderResponseError("AI provider returned an empty response.")

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str) and item.strip():
                parts.append(item.strip())
                continue

            if isinstance(item, dict):
                if item.get("type") == "text" and isinstance(item.get("text"), str):
                    text = item["text"].strip()
                    if text:
                        parts.append(text)
                    continue

                if isinstance(item.get("content"), str) and item["content"].strip():
                    parts.append(item["content"].strip())

        answer = "\n".join(parts).strip()
        if answer:
            return answer

    raise AIProviderResponseError("AI provider returned an unsupported response format.")


def _build_client(settings: Settings) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=settings.ai_request_timeout_seconds)


async def _request_groq_answer(
    question: str,
    settings: Settings,
    client: httpx.AsyncClient,
    *,
    profile_context: str = "",
) -> str:
    if not settings.groq_api_key:
        raise AIServiceConfigurationError(
            "GROQ_API_KEY must be configured when AI_PROVIDER=groq."
        )

    url = f"{settings.groq_base_url.rstrip('/')}{GROQ_CHAT_COMPLETIONS_PATH}"
    payload = {
        "model": settings.groq_model,
        "messages": _build_messages(
            question,
            settings,
            profile_context=profile_context,
        ),
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise AIProviderResponseError(
            f"Groq returned HTTP {exc.response.status_code}."
        ) from exc
    except httpx.RequestError as exc:
        raise AIProviderRequestError("Unable to reach Groq.") from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise AIProviderResponseError("Groq returned invalid JSON.") from exc

    if not isinstance(body, dict):
        raise AIProviderResponseError("Groq returned an unexpected JSON structure.")

    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        raise AIProviderResponseError("Groq returned no completion choices.")

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        raise AIProviderResponseError("Groq returned no assistant message.")

    return _extract_text_content(message.get("content"))


async def _request_ollama_answer(
    question: str,
    settings: Settings,
    client: httpx.AsyncClient,
    *,
    profile_context: str = "",
) -> str:
    url = f"{settings.ollama_base_url.rstrip('/')}{OLLAMA_CHAT_PATH}"
    payload = {
        "model": settings.ollama_model,
        "messages": _build_messages(
            question,
            settings,
            profile_context=profile_context,
        ),
        "stream": False,
    }

    try:
        response = await client.post(url, json=payload)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise AIProviderResponseError(
            f"Ollama returned HTTP {exc.response.status_code}."
        ) from exc
    except httpx.RequestError as exc:
        raise AIProviderRequestError("Unable to reach Ollama.") from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise AIProviderResponseError("Ollama returned invalid JSON.") from exc

    if not isinstance(body, dict):
        raise AIProviderResponseError("Ollama returned an unexpected response format.")

    message = body.get("message")
    if not isinstance(message, dict):
        raise AIProviderResponseError("Ollama returned no assistant message.")

    return _extract_text_content(message.get("content"))


async def answer_interview_question(
    question: str,
    *,
    settings: Settings | None = None,
    client: httpx.AsyncClient | None = None,
    profile_context: str = "",
) -> str:
    resolved_settings = settings or get_settings()
    provider = resolved_settings.ai_provider

    if provider not in {"groq", "ollama"}:
        raise AIServiceConfigurationError(
            f"Unsupported AI provider: {provider}. Set AI_PROVIDER to groq or ollama."
        )

    if client is not None:
        if provider == "groq":
            return await _request_groq_answer(
                question,
                resolved_settings,
                client,
                profile_context=profile_context,
            )
        return await _request_ollama_answer(
            question,
            resolved_settings,
            client,
            profile_context=profile_context,
        )

    async with _build_client(resolved_settings) as managed_client:
        if provider == "groq":
            return await _request_groq_answer(
                question,
                resolved_settings,
                managed_client,
                profile_context=profile_context,
            )
        return await _request_ollama_answer(
            question,
            resolved_settings,
            managed_client,
            profile_context=profile_context,
        )
