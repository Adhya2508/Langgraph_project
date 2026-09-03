"""
backend/config/settings.py
──────────────────────────
Centralized, type-safe application settings.

Loads all configuration from environment variables (via .env file).
This is the ONLY module that reads environment variables or loads .env.

Usage anywhere in the codebase:
    from backend.config.settings import settings

    api_key = settings.mistral_api_key
    model   = settings.model_name
"""

import os
import logging
from typing import Literal
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("bank-segmentation-agent.settings")

# Resolve the project root (two levels up from this file: config/ → backend/ → project root)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ENV_FILE = os.path.join(_PROJECT_ROOT, ".env")


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and .env file.

    Priority order (highest → lowest):
        1. Shell environment variables
        2. .env file at project root
        3. Field default values
    """

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",            # Silently ignore unknown env vars
    )

    # ── Application ──────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Deployment environment."
    )
    debug: bool = Field(default=True, description="Enable debug mode.")
    host: str = Field(default="0.0.0.0", description="Bind host for uvicorn.")
    port: int = Field(default=8000, description="Bind port for uvicorn.")

    # ── Logging ──────────────────────────────────────────────────────
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Application log level."
    )

    # ── Directories ──────────────────────────────────────────────────
    output_directory: str = Field(
        default="backend/outputs",
        description="Base output directory (relative to project root)."
    )
    upload_directory: str = Field(
        default="backend/uploads",
        description="Upload directory (relative to project root)."
    )

    # ── LLM Provider ─────────────────────────────────────────────────
    llm_provider: Literal["mistral"] = Field(
        default="mistral",
        description="Active LLM provider. Currently only 'mistral' is supported."
    )
    model_name: str = Field(
        default="mistral-small-latest",
        description="Model identifier passed to the LLM provider."
    )
    temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0.0–2.0)."
    )
    max_tokens: int = Field(
        default=2048,
        gt=0,
        description="Maximum tokens in LLM completion."
    )
    top_p: float = Field(
        default=0.95,
        ge=0.0,
        le=1.0,
        description="Top-p nucleus sampling parameter."
    )

    # ── Secrets ──────────────────────────────────────────────────────
    mistral_api_key: str = Field(
        default="",
        description="Mistral AI API key. Required when llm_provider='mistral'."
    )

    # ── Validators ───────────────────────────────────────────────────
    @field_validator("log_level", mode="before")
    @classmethod
    def normalise_log_level(cls, v: str) -> str:
        return v.upper()

    @field_validator("output_directory", "upload_directory", mode="before")
    @classmethod
    def resolve_directory(cls, v: str) -> str:
        """Convert relative paths to absolute using project root."""
        if not os.path.isabs(v):
            return os.path.join(_PROJECT_ROOT, v)
        return v

    @model_validator(mode="after")
    def warn_missing_api_key(self) -> "Settings":
        """
        Warn (not raise) if the LLM API key is missing.
        The system degrades gracefully to the rule-based mock engine,
        so a missing key is a warning — not a startup-blocking error.
        """
        if self.llm_provider == "mistral" and not self.mistral_api_key:
            logger.warning(
                "MISTRAL_API_KEY is not set. "
                "The system will use the rule-based mock engine instead of the real LLM. "
                "Set MISTRAL_API_KEY in your .env file to enable full AI functionality."
            )
        return self

    # ── Helpers ──────────────────────────────────────────────────────
    def get_output_subdir(self, name: str) -> str:
        """Return the absolute path of an output subdirectory."""
        return os.path.join(self.output_directory, name)

    def display(self) -> dict:
        """Return a safe, loggable representation (secrets redacted)."""
        return {
            "app_env": self.app_env,
            "debug": self.debug,
            "host": self.host,
            "port": self.port,
            "log_level": self.log_level,
            "llm_provider": self.llm_provider,
            "model_name": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "output_directory": self.output_directory,
            "upload_directory": self.upload_directory,
            "mistral_api_key": "***" if self.mistral_api_key else "(not set)",
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
# All modules import this single instance.
settings = Settings()
