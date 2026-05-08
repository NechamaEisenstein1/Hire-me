from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Hire Me"
    app_env: str = "development"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Required: must be set via APP_SECRET_KEY environment variable
    app_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_minutes: int = 30
    jwt_refresh_token_expires_days: int = 30

    rate_limit_requests_per_minute: int = 120

    cors_origins: list[str] | str = "http://localhost:4200"

    database_url: str = ""  # Required: must be set via DATABASE_URL environment variable

    github_username: str = ""
    github_token: str = ""

    ai_provider: str = "gemini"
    gemini_base_url: str = "https://generativelanguage.googleapis.com"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    ai_request_timeout_seconds: float = 30.0
    ai_verify_tls: bool = True
    resume_owner_token: str = ""
    resume_profile_path: str = "app/data/resume_profile.json"
    analytics_stats_path: str = "app/data/site_analytics.json"
    ai_system_prompt: str = (
        "You are speaking as the candidate herself on a personal software-engineering CV website. "
        "Always answer in first person, as the developer whose resume and portfolio are presented here. "
        "Match the language of the recruiter question exactly: if the question is in Hebrew, answer in Hebrew; if it is in English, answer in English. "
        "For Hebrew answers, keep the writing natural, polished, and easy to read in RTL even when English technical terms appear inline. "
        "Answer only about my fit for work, my skills, experience, education, project delivery, architecture decisions, and implementation details that are evidenced by the site and resume profile data provided in context. "
        "Be accurate, persuasive, professional, and concrete, but never invent facts. "
        "If the question is outside that scope, politely say that I answer here only about my professional fit, resume, and portfolio, and invite the recruiter to rephrase the question. "
        "If evidence is missing, say so clearly instead of guessing."
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("ai_provider", mode="before")
    @classmethod
    def validate_ai_provider(cls, value: str | None) -> str:
        provider = (value or "gemini").strip().lower()
        if provider != "gemini":
            raise ValueError("AI_PROVIDER must be set to 'gemini'.")
        return provider

    @field_validator("ai_request_timeout_seconds", mode="before")
    @classmethod
    def validate_ai_timeout(cls, value: float | str) -> float:
        timeout = float(value)
        if timeout <= 0:
            raise ValueError(
                "AI_REQUEST_TIMEOUT_SECONDS must be greater than 0.")
        return timeout

    @field_validator("app_secret_key", mode="before")
    @classmethod
    def validate_secret_key(cls, value: str | None) -> str:
        if not value or value == "change-me":
            raise ValueError(
                "APP_SECRET_KEY must be set via environment variable and not left as default. "
                "Use a strong, randomly generated value for production."
            )
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, value: str | None) -> str:
        if not value:
            raise ValueError(
                "DATABASE_URL must be set via environment variable. "
                "Format: postgresql+asyncpg://user:password@host:port/dbname"
            )
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
