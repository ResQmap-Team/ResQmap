"""
ResQMap AI — Responder Service
Business logic for volunteer / first responder management.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database import (
    DBResponder, DBMission, DBGPSTelemetry,
    responder_to_dict, mission_to_dict
)
from backend.priority_engine import haversine_meters

logger = logging.getLogger("resqmap.responder")


async def get_all_responders(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(DBResponder).order_by(DBResponder.created_at.desc())
    )
    return [responder_to_dict(r) for r in result.scalars().all()]


async def get_responder(db: AsyncSession, responder_id: str) -> Optional[DBResponder]:
    result = await db.execute(
        select(DBResponder).where(DBResponder.id == responder_id)
    )
    return result.scalar_one_or_none()


async def get_responder_by_code(db: AsyncSession, code: str) -> Optional[DBResponder]:
    result = await db.execute(
        select(DBResponder).where(DBResponder.responder_code == code)
    )
    return result.scalar_one_or_none()


async def create_responder(db: AsyncSession, data: dict) -> DBResponder:
    r = DBResponder(
        responder_code = data["responder_code"],
        name           = data["name"],
        unit           = data.get("unit", ""),
        vehicle        = data.get("vehicle", ""),
        role           = data.get("role", "VOLUNTEER"),
        skills         = ", ".join(data.get("skills", [])),
        certifications = ", ".join(data.get("certifications", [])),
        phone          = data.get("phone", ""),
        email          = data.get("email", ""),
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    logger.info(f"[Responder] Created {r.responder_code} ({r.name})")
    return r


async def update_responder_location(
    db: AsyncSession,
    responder_id: str,
    latitude: float,
    longitude: float,
    accuracy: Optional[float],
    heading: Optional[float],
    speed: Optional[float],
    incident_id: Optional[str],
) -> Optional[DBResponder]:
    """Update responder's current GPS position and record telemetry."""
    r = await get_responder(db, responder_id)
    if not r:
        return None

    r.current_latitude  = latitude
    r.current_longitude = longitude
    if incident_id:
        r.current_incident_id = incident_id

    # Record telemetry point
    telem = DBGPSTelemetry(
        responder_id = responder_id,
        incident_id  = incident_id or "",
        latitude     = latitude,
        longitude    = longitude,
        accuracy     = accuracy,
        heading      = heading,
        speed        = speed,
    )
    db.add(telem)
    await db.commit()
    await db.refresh(r)
    return r


async def get_responder_missions(
    db: AsyncSession, responder_id: str
) -> list[dict]:
    result = await db.execute(
        select(DBMission)
        .where(DBMission.responder_id == responder_id)
        .order_by(DBMission.assigned_at.desc())
    )
    return [mission_to_dict(m) for m in result.scalars().all()]


async def create_mission(
    db: AsyncSession,
    responder_id: str,
    incident_id: Optional[str],
    dest_lat: Optional[float],
    dest_lon: Optional[float],
    eta_minutes: Optional[int],
    distance_km: Optional[float],
    notes: str,
    assigned_by: str,
) -> DBMission:
    m = DBMission(
        responder_id    = responder_id,
        incident_id     = incident_id,
        destination_lat = dest_lat,
        destination_lon = dest_lon,
        eta_minutes     = eta_minutes,
        distance_km     = distance_km,
        notes           = notes,
        assigned_by     = assigned_by,
        status          = "ASSIGNED",
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)

    # Update responder status
    r = await get_responder(db, responder_id)
    if r:
        r.status = "ASSIGNED"
        if incident_id:
            r.current_incident_id = incident_id
        await db.commit()

    logger.info(f"[Mission] Created mission {m.id} for responder {responder_id}")
    return m


async def update_mission_status(
    db: AsyncSession, mission_id: str, new_status: str
) -> Optional[DBMission]:
    result = await db.execute(
        select(DBMission).where(DBMission.id == mission_id)
    )
    m = result.scalar_one_or_none()
    if not m:
        return None

    now = datetime.now(timezone.utc)
    m.status = new_status

    if new_status == "DISPATCHED" and not m.dispatched_at:
        m.dispatched_at = now
    elif new_status == "EN_ROUTE" and not m.en_route_at:
        m.en_route_at = now
    elif new_status == "ON_SCENE" and not m.on_scene_at:
        m.on_scene_at = now
        if m.assigned_at:
            delta = (now - m.assigned_at).total_seconds() / 60
            m.response_time_minutes = int(delta)
    elif new_status == "RESOLVED" and not m.resolved_at:
        m.resolved_at = now
        if m.on_scene_at:
            delta = (now - m.on_scene_at).total_seconds() / 60
            m.mission_duration_minutes = int(delta)
    elif new_status == "CANCELLED":
        m.cancelled_at = now

    await db.commit()
    await db.refresh(m)

    # Update responder status to match
    r = await get_responder(db, m.responder_id)
    if r:
        status_map = {
            "DISPATCHED": "ASSIGNED",
            "EN_ROUTE":   "EN_ROUTE",
            "ON_SCENE":   "ON_SCENE",
            "RESOLVED":   "AVAILABLE",
            "CANCELLED":  "AVAILABLE",
        }
        r.status = status_map.get(new_status, r.status)
        if new_status in ("RESOLVED", "CANCELLED"):
            r.current_incident_id = ""
        await db.commit()

    return m


async def get_nearby_available_responders(
    db: AsyncSession,
    lat: float,
    lon: float,
    required_skills: list[str] = None,
    max_results: int = 10,
) -> list[dict]:
    """
    Return available responders sorted by distance to a given coordinate.
    Optionally filter by required skills.
    """
    result = await db.execute(
        select(DBResponder).where(DBResponder.status == "AVAILABLE")
    )
    responders = result.scalars().all()

    scored = []
    for r in responders:
        if r.current_latitude is None or r.current_longitude is None:
            dist = float("inf")
        else:
            dist = haversine_meters(lat, lon, r.current_latitude, r.current_longitude)

        # Skill matching
        skill_match = True
        if required_skills:
            r_skills = [s.strip().lower() for s in (r.skills or "").split(",")]
            for req in required_skills:
                if req.lower() not in r_skills:
                    skill_match = False
                    break

        d = responder_to_dict(r)
        d["distanceM"] = round(dist, 1)
        d["distanceKm"] = round(dist / 1000, 2)
        d["skillMatch"] = skill_match
        scored.append(d)

    scored.sort(key=lambda x: (not x["skillMatch"], x["distanceM"]))
    return scored[:max_results]


async def get_all_missions(db: AsyncSession, limit: int = 50) -> list[dict]:
    """Retrieve all missions in descending chronological order."""
    result = await db.execute(
        select(DBMission).order_by(DBMission.assigned_at.desc()).limit(limit)
    )
    return [mission_to_dict(m) for m in result.scalars().all()]


HAZARD_SKILL_RECOMMENDATIONS = {
    "Flood / Waterlogging": ["Swiftwater Rescue", "Boat Operation", "Water Evacuation", "Medical / First Aid"],
    "Structural Damage / Building Collapse": ["USAR", "Structural Search", "Heavy Rescue", "K9 Search", "Medical / First Aid"],
    "Fire / Wildfire / Smoke": ["Firefighting", "Wildfire Containment", "Smoke Inhalation", "Hazmat", "Medical / First Aid"],
    "Downed Powerlines / Electrical Hazard": ["Electrical Safety", "Power Isolation", "Grid Clearance", "High Voltage"],
    "Landslide / Mudslide": ["Heavy Equipment", "Mud Clearance", "Slope Stabilization", "Search & Rescue"],
    "Road Obstruction / Debris": ["Road Clearing", "Debris Removal", "Chainsaw Operation", "Traffic Control"],
}


async def get_volunteer_system_analysis(db: AsyncSession) -> dict:
    """
    Compute comprehensive operational and fleet analytics for volunteers and first responders.
    Derived from real database records (DBResponder, DBMission).
    """
    resp_result = await db.execute(select(DBResponder))
    responders = resp_result.scalars().all()

    miss_result = await db.execute(select(DBMission))
    missions = miss_result.scalars().all()

    total_responders = len(responders)
    available_count = sum(1 for r in responders if r.status == "AVAILABLE")
    assigned_count = sum(1 for r in responders if r.status in ("ASSIGNED", "EN_ROUTE", "ON_SCENE"))
    off_duty_count = sum(1 for r in responders if r.status in ("OFF_DUTY", "UNAVAILABLE"))

    # Mission statistics
    total_missions = len(missions)
    active_missions = sum(1 for m in missions if m.status in ("ASSIGNED", "DISPATCHED", "EN_ROUTE", "ON_SCENE"))
    resolved_missions = sum(1 for m in missions if m.status == "RESOLVED")
    cancelled_missions = sum(1 for m in missions if m.status == "CANCELLED")

    # Average response times
    resp_times = [m.response_time_minutes for m in missions if m.response_time_minutes is not None and m.response_time_minutes > 0]
    avg_response_time = round(sum(resp_times) / len(resp_times), 1) if resp_times else 0.0

    # Average mission duration
    durations = [m.mission_duration_minutes for m in missions if m.mission_duration_minutes is not None and m.mission_duration_minutes > 0]
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0.0

    # Total distance covered
    distances = [m.distance_km for m in missions if m.distance_km is not None]
    total_distance_km = round(sum(distances), 1) if distances else 0.0

    # Fleet readiness score
    readiness_pct = round((available_count / total_responders) * 100, 1) if total_responders > 0 else 0.0

    # Skill breakdown
    skill_counts = {}
    for r in responders:
        if r.skills:
            for s in r.skills.split(","):
                s_clean = s.strip()
                if s_clean:
                    skill_counts[s_clean] = skill_counts.get(s_clean, 0) + 1

    # Map per-responder mission stats
    responder_mission_map = {}
    for m in missions:
        if m.responder_id not in responder_mission_map:
            responder_mission_map[m.responder_id] = {"active": 0, "resolved": 0, "total": 0}
        responder_mission_map[m.responder_id]["total"] += 1
        if m.status in ("ASSIGNED", "DISPATCHED", "EN_ROUTE", "ON_SCENE"):
            responder_mission_map[m.responder_id]["active"] += 1
        elif m.status == "RESOLVED":
            responder_mission_map[m.responder_id]["resolved"] += 1

    responder_roster = []
    for r in responders:
        rd = responder_to_dict(r)
        stats = responder_mission_map.get(r.id, {"active": 0, "resolved": 0, "total": 0})
        rd["activeMissionsCount"] = stats["active"]
        rd["completedMissionsCount"] = stats["resolved"]
        rd["totalMissionsCount"] = stats["total"]
        responder_roster.append(rd)

    return {
        "totalResponders": total_responders,
        "availableResponders": available_count,
        "busyResponders": assigned_count,
        "offDutyResponders": off_duty_count,
        "fleetReadinessPct": readiness_pct,
        "totalMissions": total_missions,
        "activeMissions": active_missions,
        "resolvedMissions": resolved_missions,
        "cancelledMissions": cancelled_missions,
        "avgResponseTimeMinutes": avg_response_time,
        "avgMissionDurationMinutes": avg_duration,
        "totalDistanceCoveredKm": total_distance_km,
        "skillDistribution": skill_counts,
        "responders": responder_roster,
        "recentMissions": [mission_to_dict(m) for m in missions[:15]],
    }


async def match_volunteers_for_incident(
    db: AsyncSession,
    incident_id: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    hazard_category: Optional[str] = None,
    severity: Optional[str] = None,
    max_results: int = 5,
) -> list[dict]:
    """
    Intelligently score and rank volunteers/responders for a specific incident
    based on required skills, availability, proximity (Haversine), workload, and incident severity.
    """
    # If incident_id is given, pull exact details from database
    target_lat = lat
    target_lon = lon
    target_hazard = hazard_category or ""
    target_severity = severity or "HIGH"

    if incident_id:
        from backend.database import DBIncident
        inc_res = await db.execute(select(DBIncident).where(DBIncident.id == incident_id))
        inc = inc_res.scalar_one_or_none()
        if inc:
            target_lat = inc.latitude
            target_lon = inc.longitude
            target_hazard = inc.hazard_category
            target_severity = inc.severity

    recommended_skills = []
    for hazard_key, skills in HAZARD_SKILL_RECOMMENDATIONS.items():
        if hazard_key.lower() in target_hazard.lower() or target_hazard.lower() in hazard_key.lower():
            recommended_skills = skills
            break
    if not recommended_skills and target_hazard:
        recommended_skills = ["Search & Rescue", "Medical / First Aid"]

    # Fetch all responders
    result = await db.execute(select(DBResponder))
    responders = result.scalars().all()

    # Fetch active missions per responder to gauge workload
    miss_res = await db.execute(
        select(DBMission).where(DBMission.status.in_(["ASSIGNED", "DISPATCHED", "EN_ROUTE", "ON_SCENE"]))
    )
    active_missions = miss_res.scalars().all()
    workload_map = {}
    for m in active_missions:
        workload_map[m.responder_id] = workload_map.get(m.responder_id, 0) + 1

    scored_candidates = []
    for r in responders:
        score = 0.0
        reasons = []

        # 1. Availability Scoring
        if r.status == "AVAILABLE":
            score += 40.0
            reasons.append("Unit is currently AVAILABLE (100% operational capacity)")
        elif r.status in ("ASSIGNED", "EN_ROUTE"):
            score += 15.0
            reasons.append(f"Unit is active ({r.status}) but within operational threshold")
        else:
            score += 0.0
            reasons.append(f"Unit is {r.status}")

        # 2. Skill Compatibility Scoring
        r_skills = [s.strip().lower() for s in (r.skills or "").split(",") if s.strip()]
        matched_skills = []
        for req in recommended_skills:
            if any(req.lower() in rs or rs in req.lower() for rs in r_skills):
                matched_skills.append(req)

        if matched_skills:
            skill_bonus = min(35.0, len(matched_skills) * 15.0)
            score += skill_bonus
            reasons.append(f"Specialized certification: {', '.join(matched_skills)} (+{int(skill_bonus)} pts)")
        elif recommended_skills:
            score += 5.0
            reasons.append("General first-response capability")

        # 3. Distance Proximity Scoring (Haversine)
        dist_m = None
        dist_km = None
        if target_lat is not None and target_lon is not None and r.current_latitude is not None and r.current_longitude is not None:
            dist_m = haversine_meters(target_lat, target_lon, r.current_latitude, r.current_longitude)
            dist_km = round(dist_m / 1000.0, 2)
            dist_bonus = max(0.0, 25.0 - (dist_km * 2.0))
            score += dist_bonus
            reasons.append(f"Proximity: {dist_km} km to incident area (+{dist_bonus:.1f} pts)")
        else:
            score += 10.0
            reasons.append("Location telemetry pending")

        # 4. Workload penalty
        active_cnt = workload_map.get(r.id, 0)
        if active_cnt > 0:
            penalty = min(20.0, active_cnt * 10.0)
            score -= penalty
            reasons.append(f"Active mission load: {active_cnt} ongoing (-{penalty:.0f} pts)")
        else:
            score += 5.0
            reasons.append("Zero current mission backlog (+5 pts)")

        # 5. Severity factor
        if target_severity == "CRITICAL" and matched_skills:
            score += 10.0
            reasons.append("High-priority tier match for CRITICAL hazard")

        final_score = round(max(0.0, min(100.0, score)), 1)

        d = responder_to_dict(r)
        d["matchScore"] = final_score
        d["matchReasons"] = reasons
        d["matchedSkills"] = matched_skills
        d["recommendedSkills"] = recommended_skills
        d["distanceM"] = dist_m
        d["distanceKm"] = dist_km
        d["activeMissionsCount"] = active_cnt
        scored_candidates.append(d)

    # Sort descending by matchScore
    scored_candidates.sort(key=lambda x: x["matchScore"], reverse=True)
    return scored_candidates[:max_results]

