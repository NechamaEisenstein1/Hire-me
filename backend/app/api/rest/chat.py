from pydantic import BaseModel
from fastapi import APIRouter

from app.services.ai_chat_service import answer_interview_question

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str


@router.post('/messages', response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    answer = await answer_interview_question(payload.question)
    return ChatResponse(answer=answer)
