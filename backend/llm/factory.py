"""
backend/llm/factory.py
───────────────────────
LLM provider factory.

Reads provider selection and model parameters from settings
(backed by .env) and llm_config.yaml defaults.

Usage:
    from backend.llm.factory import get_llm
    llm = get_llm()
"""

import logging
import os
from typing import Optional

import yaml

from backend.llm.base import BaseLLM
from backend.llm.mistral_provider import MistralProvider

logger = logging.getLogger("bank-segmentation-agent.llm_factory")

# Path to llm_config.yaml (same directory as settings.py)
_CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config")
_LLM_CONFIG_PATH = os.path.join(_CONFIG_DIR, "llm_config.yaml")


def _load_llm_config() -> dict:
    """Load llm_config.yaml; return empty dict if missing or malformed."""
    if not os.path.exists(_LLM_CONFIG_PATH):
        logger.warning(f"llm_config.yaml not found at {_LLM_CONFIG_PATH}. Using defaults.")
        return {}
    try:
        with open(_LLM_CONFIG_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as exc:
        logger.error(f"Failed to parse llm_config.yaml: {exc}. Using defaults.")
        return {}


def get_llm(provider: Optional[str] = None, **overrides) -> BaseLLM:
    """
    Factory function that returns a configured BaseLLM instance.

    Configuration priority (highest → lowest):
        1. Explicit keyword overrides passed to this function
        2. settings (from .env)
        3. llm_config.yaml defaults

    Args:
        provider: Override the provider name (default: settings.llm_provider).
        **overrides: Any MistralProvider constructor kwarg to override.

    Returns:
        BaseLLM: Configured provider instance.

    Raises:
        ValueError: If the provider is not supported.
    """
    # Import here to avoid circular imports at module load time
    from backend.config.settings import settings

    yaml_cfg = _load_llm_config()

    # Resolve provider — explicit arg > settings > yaml
    resolved_provider = (
        provider
        or settings.llm_provider
        or yaml_cfg.get("provider", "mistral")
    ).lower()

    if resolved_provider == "mistral":
        model = overrides.get(
            "model",
            settings.model_name or yaml_cfg.get("model", "mistral-small-latest"),
        )
        temperature = overrides.get(
            "temperature",
            settings.temperature if settings.temperature is not None
            else yaml_cfg.get("temperature", 0.2),
        )
        max_tokens = overrides.get(
            "max_tokens",
            settings.max_tokens if settings.max_tokens is not None
            else yaml_cfg.get("max_tokens", 2048),
        )
        timeout = overrides.get("timeout", yaml_cfg.get("timeout", 60))
        retry_attempts = overrides.get("retry_attempts", yaml_cfg.get("retry_attempts", 3))
        retry_delay = overrides.get("retry_delay", yaml_cfg.get("retry_delay", 2.0))

        logger.info(
            f"LLM factory: provider=mistral, model={model}, "
            f"temperature={temperature}, timeout={timeout}s"
        )

        return MistralProvider(
            api_key=settings.mistral_api_key,
            model=model,
            temperature=temperature,
            timeout=timeout,
            retry_attempts=retry_attempts,
            retry_delay=retry_delay,
        )

    raise ValueError(
        f"Unsupported LLM provider: '{resolved_provider}'. "
        f"Supported providers: ['mistral']"
    )
