from app.core.config import get_settings


async def answer_interview_question(question: str) -> str:
    # Call get_settings() inside function to ensure environment changes are picked up
    settings = get_settings()
    provider = settings.ai_provider.lower()

    if provider == "groq":
        return (
            "Groq provider scaffold is ready. Configure GROQ_API_KEY and wire the model call "
            "in app/services/ai_chat_service.py for production responses."
        )

    if provider == "ollama":
        return (
            "Ollama provider scaffold is ready. Connect to OLLAMA_BASE_URL and invoke "
            "OLLAMA_MODEL for full local inference responses."
        )

    return f"Unsupported AI provider: {provider}. Set AI_PROVIDER to groq or ollama."
