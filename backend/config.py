"""
ResQMap AI — Backend Configuration
Reads from environment variables / .env file.
All secrets must be in .env — never committed to git.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (one level up from backend/)
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path)

# ─── Gemini ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ─── Database ─────────────────────────────────────────────────────────────────
# SHARED DATABASE FOR PHYSICAL-SYSTEM FAILOVER:
#   All teammate laptops must point to the SAME Supabase PostgreSQL instance.
#   1. Create a free project at https://supabase.com
#   2. Go to Project Settings → Database → Connection string → URI
#   3. Replace prefix: postgresql:// → postgresql+asyncpg://
#   4. Set DATABASE_URL in .env on EVERY teammate laptop.
#
# LOCAL DEV (SQLite fallback — NOT shared across machines):
#   Leave DATABASE_URL unset. SQLite is used automatically.
#   WARNING: DB_DIR should be outside OneDrive to avoid sync conflicts.
_db_dir = Path(os.getenv("DB_DIR", str(Path(__file__).parent.parent)))
_sqlite_url = f"sqlite+aiosqlite:///{_db_dir / 'resqmap_dev.db'}"
DATABASE_URL: str = os.getenv("DATABASE_URL", _sqlite_url)
IS_POSTGRES: bool = DATABASE_URL.startswith("postgresql")

# ─── Server ───────────────────────────────────────────────────────────────────
# Comma-separated allowed CORS origins.  "*" for local dev only.
# For multi-device LAN demo use explicit origins, e.g.:
#   CORS_ORIGINS=http://192.168.1.X:5173,http://192.168.1.Y:5173
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "*").split(",")
    if o.strip()
]

# Bind address — 0.0.0.0 makes the server reachable from other LAN devices.
# Override with 127.0.0.1 if you want to restrict to localhost only.
SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")

# Port for the uvicorn server (reads Render PORT env var or SERVER_PORT)
SERVER_PORT: int = int(os.getenv("PORT", os.getenv("SERVER_PORT", "8000")))

# Node identity (useful for multi-machine logging)
NODE_ID: str = os.getenv("NODE_ID", "node-01")

# ─── TURN / ICE ───────────────────────────────────────────────────────────────
TURN_URL: str = os.getenv("TURN_URL", "")
TURN_USERNAME: str = os.getenv("TURN_USERNAME", "")
TURN_CREDENTIAL: str = os.getenv("TURN_CREDENTIAL", "")

# ─── SOS Priority Weights (configurable without code change) ──────────────────
# These weights are combined in priority_engine.py
SOS_WEIGHT_DISTANCE = float(os.getenv("SOS_WEIGHT_DISTANCE", "35"))   # % of score
SOS_WEIGHT_MEDICAL  = float(os.getenv("SOS_WEIGHT_MEDICAL",  "20"))
SOS_WEIGHT_TRAPPED  = float(os.getenv("SOS_WEIGHT_TRAPPED",  "20"))
SOS_WEIGHT_VULN     = float(os.getenv("SOS_WEIGHT_VULN",     "10"))   # elderly/infants
SOS_WEIGHT_SEVERITY = float(os.getenv("SOS_WEIGHT_SEVERITY", "10"))
SOS_WEIGHT_WAIT     = float(os.getenv("SOS_WEIGHT_WAIT",     "5"))    # time waiting
