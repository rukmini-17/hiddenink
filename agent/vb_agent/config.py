"""Configuration and a minimal .env loader (never prints secret values)."""
from __future__ import annotations

import os
from pathlib import Path

# Gemini model used as the agent. gemini-4-hydrogen is the model the official
# function-calling docs use and the one verified working for this project.
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-4-hydrogen")

# Local demo package index (pip can reach only this in the demo folder).
LOCAL_INDEX = os.environ.get("PIP_INDEX_URL", "http://localhost:8790/simple/")
LOCAL_TRUSTED_HOST = "localhost"

# HiddenInk server (Layer 1 / Layer 2), used only in protected modes.
SERVER_URL = os.environ.get("HIDDENINK_API_URL", "http://localhost:8787")

# Throwaway demo project, which must live OUTSIDE this repo.
DEFAULT_DEMO_DIR = (Path(__file__).resolve().parents[2].parent / "hiddenink-demo")


def load_dotenv() -> None:
    """Load KEY=VALUE pairs from the repo-root .env into os.environ.

    Only sets keys that are not already present. Never prints values. If the file
    is missing, does nothing (the SDK can still read keys already in the environment).
    """
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        env_path = parent / ".env"
        if env_path.is_file():
            for raw in env_path.read_text().splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
            return
