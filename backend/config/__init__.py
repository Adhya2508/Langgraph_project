# backend/config/__init__.py
# Makes backend/config a proper Python package.
# Import settings from here for convenience.
from backend.config.settings import settings

__all__ = ["settings"]
