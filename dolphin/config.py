"""
Application settings loaded from environment variables and .env file.
Uses pydantic-settings for type-safe configuration.
"""

from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env path relative to this file's directory
_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # Dolphin Anty API
    dolphin_api_key: SecretStr
    dolphin_api_url: str = "https://dolphin-anty-api.com"

    # Reddit checking
    reddit_user_agent: str = "DolphinTracker/2.0"
    reddit_min_delay: float = 2.0
    reddit_max_delay: float = 5.0
    reddit_max_retries: int = 5
    reddit_backoff_base: float = 2.0

    @field_validator("dolphin_api_key", mode="before")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Ensure API key is not empty."""
        if not v or v.strip() == "":
            raise ValueError("DOLPHIN_API_KEY must be set")
        return v


# Create singleton instance
settings = Settings()

# Backward compatibility exports for tracker.py
# These allow existing code to continue working without modification
DOLPHIN_API_KEY = settings.dolphin_api_key.get_secret_value()
DOLPHIN_API_URL = settings.dolphin_api_url
