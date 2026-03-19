from __future__ import annotations

import contextvars
import logging
import os
import sys
import warnings
from typing import Any

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class PrettyConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, datefmt="%H:%M:%S")
        level = f"{record.levelname:<7}"
        logger_name = f"{record.name:<22}"
        req_id = getattr(record, "request_id", "-")
        parts = [f"[{timestamp}]", level, logger_name]
        if req_id != "-":
            parts.append(f"req={req_id}")
        if hasattr(record, "job_id"):
            parts.append(f"job={getattr(record, 'job_id')}")
        message = record.getMessage()
        rendered = " ".join(parts) + f" | {message}"
        if record.exc_info:
            rendered += "\n" + self.formatException(record.exc_info)
        return rendered


def _quiet_third_party_logs() -> None:
    noisy_loggers = {
        "httpx": logging.WARNING,
        "httpcore": logging.WARNING,
        "urllib3": logging.WARNING,
        "qdrant_client": logging.WARNING,
        "google_genai": logging.WARNING,
        "google_genai.models": logging.WARNING,
        "sentence_transformers": logging.WARNING,
        "transformers": logging.WARNING,
        "huggingface_hub": logging.ERROR,
        "huggingface_hub.utils._http": logging.ERROR,
    }
    for logger_name, level in noisy_loggers.items():
        logging.getLogger(logger_name).setLevel(level)

    os.environ.setdefault("HF_HUB_VERBOSITY", "error")
    os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

    warnings.filterwarnings(
        "ignore",
        message="You are sending unauthenticated requests to the HF Hub.*",
    )
    warnings.filterwarnings(
        "ignore",
        message="You are sending unauthenticated requests to the HF Hub.*",
        module="huggingface_hub.utils._http",
    )

    try:
        from huggingface_hub.utils import disable_progress_bars

        disable_progress_bars()
    except Exception:
        pass

    try:
        from transformers.utils import logging as transformers_logging

        transformers_logging.set_verbosity_error()
        transformers_logging.disable_progress_bar()
    except Exception:
        pass


def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level.upper())
    handler.setFormatter(PrettyConsoleFormatter())
    handler.addFilter(RequestContextFilter())
    root.handlers.clear()
    root.addHandler(handler)
    _quiet_third_party_logs()


def logger(name: str, **extra: Any) -> logging.LoggerAdapter:
    return logging.LoggerAdapter(logging.getLogger(name), extra)
