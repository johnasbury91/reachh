"""
Application settings loaded from environment variables and .env file.
Uses pydantic-settings for type-safe configuration.
"""

import json
import logging
from logging.handlers import TimedRotatingFileHandler
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

    # Google Sheets sync (optional - only required for sheets sync feature)
    google_credentials_json: SecretStr | None = None
    google_sheets_id: str | None = None

    @field_validator("dolphin_api_key", mode="before")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        """Ensure API key is not empty."""
        if not v or v.strip() == "":
            raise ValueError("DOLPHIN_API_KEY must be set")
        return v

    @field_validator("google_credentials_json", mode="before")
    @classmethod
    def validate_google_credentials(cls, v: str | None) -> str | None:
        """Validate that Google credentials JSON can be parsed."""
        if v is None or v.strip() == "":
            return None
        try:
            parsed = json.loads(v)
            if not isinstance(parsed, dict) or "type" not in parsed:
                raise ValueError("Invalid Google credentials: missing 'type' field")
            return v
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid Google credentials JSON: {e}")


# Create singleton instance
settings = Settings()

# Backward compatibility exports for tracker.py
# These allow existing code to continue working without modification
DOLPHIN_API_KEY = settings.dolphin_api_key.get_secret_value()
DOLPHIN_API_URL = settings.dolphin_api_url


def setup_logging() -> logging.Logger:
    """
    Configure logging for scheduled tracker execution.

    Creates file handler with daily rotation (30-day retention) and console handler.
    Returns logger named "tracker" at INFO level.
    """
    # Create logs directory if not exists
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)

    # Get or create logger
    logger = logging.getLogger("tracker")

    # Guard against duplicate handlers (if called multiple times)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # Formatter with timestamp
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # File handler with daily rotation and 30-day retention
    log_file = logs_dir / "tracker.log"
    file_handler = TimedRotatingFileHandler(
        filename=str(log_file),
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8",
    )
    file_handler.suffix = "%Y-%m-%d"
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Console handler (for launchd capture and interactive use)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger
