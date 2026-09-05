#!/usr/bin/env python3
"""
ResQMap AI — Backend Launcher
Run from the project ROOT directory:

    python run.py

The server binds to 0.0.0.0 by default (accessible from other LAN devices).
Override host/port via environment variables or .env:
    SERVER_HOST=0.0.0.0  (default - LAN accessible)
    SERVER_PORT=8000     (default)

To restrict to localhost only: set SERVER_HOST=127.0.0.1 in .env
"""
import uvicorn
from backend.config import SERVER_HOST, SERVER_PORT

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=True,           # auto-reload on code changes during development
        reload_dirs=["backend"],
        log_level="info",
    )
