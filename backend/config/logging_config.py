"""
backend/config/logging_config.py
─────────────────────────────────
Centralized logging configuration.

Call configure_logging() once at application startup (from main.py).
After that, every module obtains its logger the normal way:

    import logging
    logger = logging.getLogger("bank-segmentation-agent.my_module")
"""

import logging
import logging.handlers
import os
import sys
from typing import Optional


# Module-level sentinel so configure_logging() is idempotent
_configured = False


def configure_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    log_format: Optional[str] = None,
) -> None:
    """
    Configure the root logger for the entire application.

    Args:
        level:      Log level string — DEBUG, INFO, WARNING, ERROR, CRITICAL.
        log_file:   Absolute path to the log file. If None, file logging is skipped.
        log_format: Custom format string. Defaults to timestamped format.
    """
    global _configured
    if _configured:
        return

    numeric_level = getattr(logging, level.upper(), logging.INFO)
    fmt = log_format or "%(asctime)s [%(levelname)-8s] %(name)s: %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(fmt, datefmt=date_fmt)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # ── Console handler ───────────────────────────────────────────
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(numeric_level)
    stream_handler.setFormatter(formatter)
    root_logger.addHandler(stream_handler)

    # ── File handler (rotating, 5 MB × 3 backups) ────────────────
    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=5 * 1024 * 1024,  # 5 MB
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    # Silence noisy third-party loggers at WARNING unless we're in DEBUG
    if numeric_level > logging.DEBUG:
        for noisy in ("uvicorn.access", "httpx", "httpcore"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

    _configured = True
    logging.getLogger("bank-segmentation-agent.logging_config").info(
        f"Logging configured — level={level}"
        + (f", file={log_file}" if log_file else "")
    )
