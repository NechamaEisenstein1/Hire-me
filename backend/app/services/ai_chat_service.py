from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings, get_settings

GEMINI_GENERATE_CONTENT_PATH_TEMPLATE = "/v1beta/models/{model}:generateContent"


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
    return httpx.AsyncClient(
        timeout=settings.ai_request_timeout_seconds,
        verify=settings.ai_verify_tls,
    )


async def _request_gemini_answer(
    question: str,
    settings: Settings,
    client: httpx.AsyncClient,
    *,
    profile_context: str = "",
) -> str:
    if not settings.gemini_api_key:
        raise AIServiceConfigurationError(
            "GEMINI_API_KEY must be configured when AI_PROVIDER=gemini."
        )

    model = settings.gemini_model.strip()
    if not model:
        raise AIServiceConfigurationError(
            "GEMINI_MODEL must be configured when AI_PROVIDER=gemini."
        )

    path = GEMINI_GENERATE_CONTENT_PATH_TEMPLATE.format(model=model)
    url = f"{settings.gemini_base_url.rstrip('/')}{path}"

    user_prompt = question.strip()
    if profile_context.strip():
        user_prompt = f"{user_prompt}\n\nCandidate profile context:\n{profile_context.strip()}"

    payload = {
        "systemInstruction": {
            "parts": [{"text": settings.ai_system_prompt}],
        },
        "contents": [
            {
                "parts": [{"text": user_prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
        },
    }

    headers = {
        "x-goog-api-key": settings.gemini_api_key,
        "Content-Type": "application/json",
    }

    try:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise AIProviderResponseError(
            f"Gemini returned HTTP {exc.response.status_code}."
        ) from exc
    except httpx.RequestError as exc:
        raise AIProviderRequestError("Unable to reach Gemini.") from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise AIProviderResponseError("Gemini returned invalid JSON.") from exc

    if not isinstance(body, dict):
        raise AIProviderResponseError("Gemini returned an unexpected JSON structure.")

    candidates = body.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise AIProviderResponseError("Gemini returned no completion candidates.")

    first_candidate = candidates[0] if isinstance(candidates[0], dict) else None
    content = first_candidate.get("content") if isinstance(first_candidate, dict) else None
    if not isinstance(content, dict):
        raise AIProviderResponseError("Gemini returned no assistant content.")

    parts = content.get("parts")
    if not isinstance(parts, list) or not parts:
        raise AIProviderResponseError("Gemini returned no content parts.")

    text_parts = []
    for part in parts:
        if isinstance(part, dict) and isinstance(part.get("text"), str):
            value = part["text"].strip()
            if value:
                text_parts.append(value)

    if not text_parts:
        raise AIProviderResponseError("Gemini returned an empty response.")

    return "\n".join(text_parts)


async def answer_interview_question(
    question: str,
    *,
    settings: Settings | None = None,
    client: httpx.AsyncClient | None = None,
    profile_context: str = "",
) -> str:
    resolved_settings = settings or get_settings()
    provider = resolved_settings.ai_provider
    if provider != "gemini":
        raise AIServiceConfigurationError(
            "Unsupported AI provider. Set AI_PROVIDER to gemini."
        )

    if client is not None:
        return await _request_gemini_answer(
            question,
            resolved_settings,
            client,
            profile_context=profile_context,
        )

    async with _build_client(resolved_settings) as managed_client:
        return await _request_gemini_answer(
            question,
            resolved_settings,
            managed_client,
            profile_context=profile_context,
        )
