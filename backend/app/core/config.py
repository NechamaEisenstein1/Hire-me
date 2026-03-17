from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Hire Me"
    app_env: str = "development"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    app_secret_key: str  # Required: must be set via APP_SECRET_KEY environment variable
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_minutes: int = 30
    jwt_refresh_token_expires_days: int = 30

    rate_limit_requests_per_minute: int = 120

    cors_origins: list[str] = ["http://localhost:4200"]

    database_url: str  # Required: must be set via DATABASE_URL environment variable

    github_username: str = ""
    github_token: str = ""

    ai_provider: str = "ollama"
    groq_api_key: str = ""
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.1:8b"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

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
