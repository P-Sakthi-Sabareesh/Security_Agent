"""Local entry point for the Hindy SOC Memory Agent API."""

from __future__ import annotations

import os
from pathlib import Path

import uvicorn


ROOT_DIR = Path(__file__).resolve().parent


def main() -> None:
    """Start the local FastAPI server from a stable repository root."""
    os.chdir(ROOT_DIR)
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
