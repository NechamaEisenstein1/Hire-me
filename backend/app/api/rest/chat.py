from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.services.ai_chat_service import (
    AIProviderRequestError,
    AIProviderResponseError,
    AIServiceConfigurationError,
    answer_interview_question,
)
from app.services.resume_profile_service import (
    build_resume_profile_context,
    get_resume_profile,
)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)

    @field_validator("question", mode="before")
    @classmethod
    def validate_question(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        question = value.strip()
        if not question:
            raise ValueError("Question must not be empty.")
        return question


class ChatResponse(BaseModel):
    answer: str


@router.post('/messages', response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    profile_context = ""
    try:
        profile_context = build_resume_profile_context(get_resume_profile())
    except Exception:
        # Keep chat endpoint available even when resume profile source is unavailable.
        profile_context = ""

    try:
        answer = await answer_interview_question(
            payload.question,
            profile_context=profile_context,
        )
    except AIServiceConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except AIProviderRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except AIProviderResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ChatResponse(answer=answer)
