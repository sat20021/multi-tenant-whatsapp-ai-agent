"""
Configuration for the AI service.
Validates required environment variables on startup.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    PORT: int = int(os.getenv("PORT", "8000"))
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")

    # Google Gemini
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # OpenAI (alternative)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Reliability
    LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "3"))
    LLM_RETRY_WAIT_SECONDS: float = float(os.getenv("LLM_RETRY_WAIT_SECONDS", "2"))

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


config = Config()


def validate_config():
    """Fail fast if required config is missing."""
    if config.LLM_PROVIDER == "gemini" and not config.GOOGLE_API_KEY:
        raise RuntimeError(
            "GOOGLE_API_KEY is required when LLM_PROVIDER=gemini. "
            "Set it in ai-service/.env"
        )
    if config.LLM_PROVIDER == "openai" and not config.OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is required when LLM_PROVIDER=openai. "
            "Set it in ai-service/.env"
        )
