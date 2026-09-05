"""
ResQMap AI — SOS Priority Engine

Calculates an AI-assisted emergency triage priority for incoming SOS requests.

Scoring is multi-factor (0–100 scale, higher = more urgent):
  - Distance to disaster epicenter  (35%)
  - Medical urgency                 (20%)
  - Trapped victims                 (20%)
  - Vulnerable people               (10%)
  - Hazard severity                 (10%)
  - Time waiting                    ( 5%)

Priority levels:
  P0 CRITICAL  — score >= 75
  P1 HIGH      — score >= 50
  P2 MEDIUM    — score >= 25
  P3 LOW       — score < 25

Human dispatchers can override the calculated priority at any time.
"""
import math
import json
from datetime import datetime, timezone
from typing import Optional

from backend.config import (
    SOS_WEIGHT_DISTANCE,
    SOS_WEIGHT_MEDICAL,
    SOS_WEIGHT_TRAPPED,
    SOS_WEIGHT_VULN,
    SOS_WEIGHT_SEVERITY,
    SOS_WEIGHT_WAIT,
)


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Geodesic distance between two points in metres (Haversine formula)."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ─── Factor scorers (each returns 0.0 – 1.0) ─────────────────────────────────

def _score_distance(distance_m: Optional[float]) -> tuple[float, str]:
    """
    Closer to epicenter → higher score.
    Score drops linearly from 1.0 at 0 m to 0.0 at 5 km, capped below.
    """
    if distance_m is None:
        return 0.4, "Distance to epicenter unknown (mid-score applied)"
    km = distance_m / 1000.0
    score = max(0.0, 1.0 - (km / 5.0))
    if km < 0.5:
        reason = f"Critically close to epicenter ({km:.1f} km)"
    elif km < 1.5:
        reason = f"Very close to epicenter ({km:.1f} km)"
    elif km < 3.0:
        reason = f"Moderate distance from epicenter ({km:.1f} km)"
    else:
        reason = f"Further from epicenter ({km:.1f} km)"
    return round(score, 4), reason


def _score_medical(needs_medical: bool) -> tuple[float, str]:
    if needs_medical:
        return 1.0, "Medical emergency reported"
    return 0.0, ""


def _score_trapped(trapped_count: int) -> tuple[float, str]:
    if trapped_count <= 0:
        return 0.0, ""
    # Diminishing returns: 1 trapped → 0.5, 2 → 0.75, 4 → 0.9, 8+ → ~1.0
    score = 1.0 - (1.0 / (1.0 + trapped_count * 0.5))
    return round(min(1.0, score), 4), f"{trapped_count} trapped victim(s) reported"


def _score_vulnerability(has_elderly_or_infants: bool) -> tuple[float, str]:
    if has_elderly_or_infants:
        return 1.0, "Elderly or infant victims present"
    return 0.0, ""


def _score_severity(severity: Optional[str]) -> tuple[float, str]:
    mapping = {"CRITICAL": 1.0, "HIGH": 0.67, "MEDIUM": 0.33, "LOW": 0.0}
    s = (severity or "MEDIUM").upper()
    score = mapping.get(s, 0.33)
    return score, f"Disaster severity: {s}"


def _score_wait(created_at: Optional[datetime]) -> tuple[float, str]:
    """
    Longer wait → higher urgency boost.
    Score climbs from 0 at 0 min to 1.0 at 30+ min.
    """
    if created_at is None:
        return 0.0, ""
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    minutes = (now - created_at).total_seconds() / 60.0
    score = min(1.0, minutes / 30.0)
    return round(score, 4), f"Waiting {minutes:.0f} minute(s)"


# ─── Main scoring function ────────────────────────────────────────────────────

def calculate_priority(
    *,
    sos_lat: float,
    sos_lon: float,
    needs_medical: bool,
    trapped_count: int,
    has_elderly_or_infants: bool,
    incident_lat: Optional[float] = None,
    incident_lon: Optional[float] = None,
    incident_severity: Optional[str] = None,
    created_at: Optional[datetime] = None,
) -> dict:
    """
    Returns a dict with:
      score         — float 0-100 (higher = more urgent)
      level         — str  P0/P1/P2/P3
      reasons       — list[str] explaining the score
      distance_m    — float|None  distance to nearest epicenter
    """
    reasons: list[str] = []

    # Calculate distance if we have an epicenter
    distance_m: Optional[float] = None
    if incident_lat is not None and incident_lon is not None:
        distance_m = haversine_meters(sos_lat, sos_lon, incident_lat, incident_lon)

    # Score each factor
    d_score, d_reason   = _score_distance(distance_m)
    m_score, m_reason   = _score_medical(needs_medical)
    t_score, t_reason   = _score_trapped(trapped_count)
    v_score, v_reason   = _score_vulnerability(has_elderly_or_infants)
    s_score, s_reason   = _score_severity(incident_severity)
    w_score, w_reason   = _score_wait(created_at)

    # Weighted sum (weights sum to ~100%)
    total_weight = (
        SOS_WEIGHT_DISTANCE + SOS_WEIGHT_MEDICAL + SOS_WEIGHT_TRAPPED
        + SOS_WEIGHT_VULN + SOS_WEIGHT_SEVERITY + SOS_WEIGHT_WAIT
    )
    raw_score = (
        d_score * SOS_WEIGHT_DISTANCE
        + m_score * SOS_WEIGHT_MEDICAL
        + t_score * SOS_WEIGHT_TRAPPED
        + v_score * SOS_WEIGHT_VULN
        + s_score * SOS_WEIGHT_SEVERITY
        + w_score * SOS_WEIGHT_WAIT
    )
    score = round((raw_score / total_weight) * 100.0, 2)

    # Collect non-empty reasons
    for r in [d_reason, m_reason, t_reason, v_reason, s_reason, w_reason]:
        if r:
            reasons.append(r)

    # Map score → P0/P1/P2/P3
    if score >= 75:
        level = "P0"
    elif score >= 50:
        level = "P1"
    elif score >= 25:
        level = "P2"
    else:
        level = "P3"

    return {
        "score": score,
        "level": level,
        "reasons": reasons,
        "distance_m": round(distance_m, 1) if distance_m is not None else None,
    }
