"""
ResQMap AI — FastAPI Backend
Bind with:  uvicorn backend.main:app --host 0.0.0.0 --port 8000

All routes use /api/ prefix so they can be proxied cleanly.
WebSocket is at /ws.
"""
import json
import logging
import socket
import base64
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import (
    FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect,
    UploadFile, File, Form, status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import CORS_ORIGINS, NODE_ID, TURN_URL, TURN_USERNAME, TURN_CREDENTIAL, IS_POSTGRES, SERVER_HOST, SERVER_PORT
from backend.database import (
    init_db, get_db, json_loads_safe,
    DBIncident, DBIncidentEvent, DBSOSRequest, DBResponder,
    DBMission, DBGPSTelemetry, DBLiveFeed,
    incident_to_dict, sos_to_dict, responder_to_dict,
    mission_to_dict, feed_to_dict,
)
from backend.websocket_manager import manager, WSEvent
from backend.ai_engine import classify_image_base64, classify_image_url
from backend.priority_engine import calculate_priority
from backend.responder_service import (
    get_all_responders, create_responder, update_responder_location,
    get_responder_missions, create_mission, update_mission_status,
    get_nearby_available_responders, get_responder,
    get_volunteer_system_analysis, match_volunteers_for_incident,
    get_all_missions,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("resqmap.main")

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ResQMap AI Backend",
    version="1.0.0",
    description="Citizen disaster reporting, SOS triage, responder coordination, live feed management.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()
    # Detect and log LAN IP for easy device access
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        lan_ip = "unknown"
    db_mode = "PostgreSQL (Supabase)" if IS_POSTGRES else "SQLite (local dev)"
    logger.info("=" * 60)
    logger.info(f"  ResQMap AI Backend — Node: {NODE_ID}")
    logger.info(f"  Database: {db_mode}")
    logger.info(f"  Bind:     {SERVER_HOST}:{SERVER_PORT}")
    logger.info(f"  LAN access: http://{lan_ip}:{SERVER_PORT}  (share with teammates)")
    logger.info(f"  Frontend:   http://{lan_ip}:5173")
    logger.info("=" * 60)



# ─── Pydantic request/response schemas ───────────────────────────────────────

class IncidentCreateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = ""
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    reporter_name: Optional[str] = "Anonymous Citizen"
    reporter_phone: Optional[str] = None
    trapped_count: int = 0
    needs_medical: bool = False
    needs_boat: bool = False
    has_elderly_or_infants: bool = False
    notes: Optional[str] = None
    api_key: Optional[str] = None   # per-request Gemini key override


class IncidentStatusUpdate(BaseModel):
    status: str
    assigned_unit: Optional[str] = None
    responder_eta_minutes: Optional[int] = None
    responder_distance_km: Optional[float] = None
    responder_notes: Optional[str] = None


class SOSCreateRequest(BaseModel):
    latitude: float
    longitude: float
    reporter_name: Optional[str] = "Unknown"
    reporter_phone: Optional[str] = ""
    trapped_count: int = 0
    needs_medical: bool = False
    has_elderly_or_infants: bool = False
    victim_notes: Optional[str] = ""
    incident_id: Optional[str] = None  # Nearest known incident


class SOSOverrideRequest(BaseModel):
    priority_level: str = Field(..., pattern="^P[0-3]$")
    override_by: str = "Dispatcher"
    reason: Optional[str] = None


class ResponderCreateRequest(BaseModel):
    responder_code: str
    name: str
    unit: Optional[str] = ""
    vehicle: Optional[str] = ""
    role: Optional[str] = "VOLUNTEER"
    skills: list[str] = []
    certifications: list[str] = []
    phone: Optional[str] = ""
    email: Optional[str] = ""


class ResponderLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    incident_id: Optional[str] = None


class MissionCreateRequest(BaseModel):
    incident_id: Optional[str] = None
    dest_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    notes: Optional[str] = ""
    assigned_by: Optional[str] = "SYSTEM"


class MissionStatusUpdate(BaseModel):
    status: str


class LiveClassifyRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    api_key: Optional[str] = None


class FeedRegisterRequest(BaseModel):
    responder_id: Optional[str] = None
    incident_id: Optional[str] = ""
    peer_room_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class FeedStatusUpdate(BaseModel):
    status: str
    viewer_count: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None


class VolunteerMatchRequest(BaseModel):
    incident_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hazard_category: Optional[str] = None
    severity: Optional[str] = None
    max_results: Optional[int] = 5



# ─── Helpers ─────────────────────────────────────────────────────────────────

def _now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


def _priority_from_severity(severity: str) -> str:
    mapping = {"CRITICAL": "P0", "HIGH": "P1", "MEDIUM": "P2", "LOW": "P3"}
    return mapping.get(severity.upper(), "P2")


async def _find_nearest_incident(
    db: AsyncSession, lat: float, lon: float
) -> tuple[Optional[DBIncident], Optional[float]]:
    """Find nearest active real incident and return (incident, distance_m)."""
    from backend.priority_engine import haversine_meters
    result = await db.execute(
        select(DBIncident).where(
            DBIncident.is_real_disaster == True,
            DBIncident.status.not_in(["RESOLVED", "FLAGGED_FALSE_ALARM"])
        )
    )
    incidents = result.scalars().all()
    if not incidents:
        return None, None

    nearest, nearest_dist = None, float("inf")
    for inc in incidents:
        d = haversine_meters(lat, lon, inc.latitude, inc.longitude)
        if d < nearest_dist:
            nearest, nearest_dist = inc, d
    return nearest, nearest_dist


# ─── HEALTH & ROOT ───────────────────────────────────────────────────────────

@app.get("/")
@app.head("/")
async def root():
    """Root status endpoint for uptime monitors and load balancers."""
    return {
        "status": "ok",
        "service": "ResQMap AI Emergency Platform",
        "version": "1.0.0",
        "health_check": "/api/health"
    }


@app.get("/api/health")
@app.head("/api/health")
async def health():
    """Health check — used by frontends for physical-system failover detection."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        lan_ip = "unknown"
    return {
        "status": "ok",
        "node": NODE_ID,
        "lan_ip": lan_ip,
        "db_mode": "postgres" if IS_POSTGRES else "sqlite",
        "timestamp": _now_str(),
        "ws_url": f"ws://{lan_ip}:{SERVER_PORT}/ws",
    }


# ─── INCIDENTS ───────────────────────────────────────────────────────────────

@app.get("/api/incidents")
async def list_incidents(
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(DBIncident).options(selectinload(DBIncident.events))
    if status_filter:
        q = q.where(DBIncident.status == status_filter)
    q = q.order_by(desc(DBIncident.created_at)).limit(limit)
    result = await db.execute(q)
    return [incident_to_dict(i) for i in result.scalars().all()]


@app.post("/api/incidents", status_code=201)
async def create_incident(
    req: IncidentCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # Run AI classification if image provided
    ai = None
    img_b64 = req.image_base64
    if img_b64:
        # Strip data: prefix if present
        if img_b64.startswith("data:"):
            parts = img_b64.split(";base64,", 1)
            mime = parts[0].replace("data:", "")
            img_b64 = parts[1] if len(parts) > 1 else img_b64
        else:
            mime = "image/jpeg"
        ai = await classify_image_base64(img_b64, mime, req.api_key)
    elif req.image_url:
        ai = await classify_image_url(req.image_url, req.api_key)

    if ai is None:
        ai = {
            "hazard_category": "Other Hazard",
            "severity": "MEDIUM",
            "confidence": 0.0,
            "is_real_disaster": True,
            "authenticity_score": 50.0,
            "false_alarm_reason": None,
            "visual_features": [],
            "recommended_units": [],
            "damage_assessment": "",
            "safety_instructions": [],
        }

    severity = ai["severity"]
    priority = _priority_from_severity(severity)
    final_status = "VERIFIED" if ai["is_real_disaster"] else "FLAGGED_FALSE_ALARM"

    inc = DBIncident(
        latitude  = req.latitude,
        longitude = req.longitude,
        address   = req.address or "",
        title     = req.title or f"{ai['hazard_category']} at {req.address or req.latitude}",
        description = req.description or "",
        image_url   = req.image_url or "",
        image_base64 = img_b64 or "",
        reporter_name = req.reporter_name or "Anonymous Citizen",
        reporter_phone = req.reporter_phone or "",
        hazard_category     = ai["hazard_category"],
        severity            = severity,
        confidence          = ai["confidence"],
        is_real_disaster    = ai["is_real_disaster"],
        authenticity_score  = ai["authenticity_score"],
        false_alarm_reason  = ai.get("false_alarm_reason") or "",
        visual_features     = json.dumps(ai.get("visual_features", [])),
        recommended_units   = json.dumps(ai.get("recommended_units", [])),
        damage_assessment   = ai.get("damage_assessment", ""),
        safety_instructions = json.dumps(ai.get("safety_instructions", [])),
        trapped_count         = req.trapped_count,
        needs_medical         = req.needs_medical,
        needs_boat            = req.needs_boat,
        has_elderly_or_infants = req.has_elderly_or_infants,
        notes  = req.notes or "",
        status = final_status,
        priority = priority,
    )
    db.add(inc)
    await db.flush()  # get inc.id

    # Initial event log
    event = DBIncidentEvent(
        incident_id = inc.id,
        text = f"Incident created by {inc.reporter_name} — AI: {ai['hazard_category']} {severity} ({ai['confidence']*100:.0f}% confidence)"
    )
    db.add(event)
    await db.commit()
    await db.refresh(inc)

    inc_dict = incident_to_dict(inc)
    await manager.broadcast(WSEvent.INCIDENT_CREATED, {"incident": inc_dict})
    logger.info(f"[Incident] Created {inc.id} — {inc.hazard_category} {inc.severity}")
    return inc_dict


@app.get("/api/incidents/{incident_id}")
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DBIncident)
        .where(DBIncident.id == incident_id)
        .options(selectinload(DBIncident.events))
    )
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident_to_dict(inc)


@app.patch("/api/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    req: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DBIncident)
        .where(DBIncident.id == incident_id)
        .options(selectinload(DBIncident.events))
    )
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.status = req.status
    inc.updated_at = datetime.now(timezone.utc)
    if req.assigned_unit is not None:
        inc.assigned_unit = req.assigned_unit
    if req.responder_eta_minutes is not None:
        inc.responder_eta_minutes = req.responder_eta_minutes
    if req.responder_distance_km is not None:
        inc.responder_distance_km = req.responder_distance_km
    if req.responder_notes is not None:
        inc.responder_notes = req.responder_notes

    ev = DBIncidentEvent(
        incident_id = inc.id,
        text = f"Status updated to {req.status}" + (f" — Unit: {req.assigned_unit}" if req.assigned_unit else "")
    )
    db.add(ev)
    await db.commit()
    await db.refresh(inc)

    inc_dict = incident_to_dict(inc)
    await manager.broadcast(WSEvent.INCIDENT_STATUS_CHANGED, {"incident": inc_dict})
    return inc_dict


@app.patch("/api/incidents/{incident_id}/dispatch")
async def dispatch_incident(
    incident_id: str,
    req: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Convenience alias — dispatches a unit to an incident."""
    return await update_incident_status(incident_id, req, db)


# ─── AI CLASSIFICATION (live / judge sandbox) ────────────────────────────────

@app.post("/api/classify-live")
async def classify_live(req: LiveClassifyRequest):
    """Classify an image without creating a persistent incident. For Judge Sandbox."""
    if not req.image_base64 and not req.image_url:
        raise HTTPException(400, "Provide image_base64 or image_url")

    if req.image_base64:
        b64 = req.image_base64
        mime = "image/jpeg"
        if b64.startswith("data:"):
            parts = b64.split(";base64,", 1)
            mime = parts[0].replace("data:", "")
            b64 = parts[1] if len(parts) > 1 else b64
        result = await classify_image_base64(b64, mime, req.api_key)
    else:
        result = await classify_image_url(req.image_url, req.api_key)

    # Normalise key names to camelCase for frontend compatibility
    return {
        "hazardCategory":     result["hazard_category"],
        "severity":           result["severity"],
        "confidence":         result["confidence"],
        "isRealDisaster":     result["is_real_disaster"],
        "authenticityScore":  result["authenticity_score"],
        "falseAlarmReason":   result.get("false_alarm_reason"),
        "visualFeatures":     result.get("visual_features", []),
        "recommendedUnits":   result.get("recommended_units", []),
        "damageAssessment":   result.get("damage_assessment", ""),
        "safetyInstructions": result.get("safety_instructions", []),
    }


# ─── SOS ─────────────────────────────────────────────────────────────────────

@app.post("/api/sos", status_code=201)
async def create_sos(req: SOSCreateRequest, db: AsyncSession = Depends(get_db)):
    # Find nearest active incident for distance scoring
    nearest_inc, distance_m = await _find_nearest_incident(db, req.latitude, req.longitude)

    inc_severity = nearest_inc.severity if nearest_inc else None
    inc_lat = nearest_inc.latitude if nearest_inc else None
    inc_lon = nearest_inc.longitude if nearest_inc else None

    priority = calculate_priority(
        sos_lat = req.latitude,
        sos_lon = req.longitude,
        needs_medical = req.needs_medical,
        trapped_count = req.trapped_count,
        has_elderly_or_infants = req.has_elderly_or_infants,
        incident_lat = inc_lat,
        incident_lon = inc_lon,
        incident_severity = inc_severity,
        created_at = datetime.now(timezone.utc),
    )

    sos = DBSOSRequest(
        latitude            = req.latitude,
        longitude           = req.longitude,
        reporter_name       = req.reporter_name or "Unknown",
        reporter_phone      = req.reporter_phone or "",
        trapped_count       = req.trapped_count,
        needs_medical       = req.needs_medical,
        has_elderly_or_infants = req.has_elderly_or_infants,
        victim_notes        = req.victim_notes or "",
        incident_id         = req.incident_id or (nearest_inc.id if nearest_inc else None),
        priority_score      = priority["score"],
        priority_level      = priority["level"],
        priority_reason     = json.dumps(priority["reasons"]),
        distance_to_epicenter_m = priority["distance_m"],
        nearest_incident_id = nearest_inc.id if nearest_inc else "",
        status              = "ACTIVE",
    )
    db.add(sos)
    await db.commit()
    await db.refresh(sos)

    sos_dict = sos_to_dict(sos)
    await manager.broadcast(WSEvent.SOS_CREATED, {"sos": sos_dict})
    logger.info(f"[SOS] Created {sos.id} — {sos.priority_level} (score {sos.priority_score:.1f})")
    return sos_dict


@app.get("/api/sos/queue")
async def get_sos_queue(
    status_filter: Optional[str] = "ACTIVE",
    db: AsyncSession = Depends(get_db),
):
    """Return the SOS priority queue sorted by score descending (most urgent first)."""
    q = select(DBSOSRequest)
    if status_filter and status_filter != "ALL":
        q = q.where(DBSOSRequest.status == status_filter)
    q = q.order_by(desc(DBSOSRequest.priority_score))
    result = await db.execute(q)
    return [sos_to_dict(s) for s in result.scalars().all()]


@app.patch("/api/sos/{sos_id}/priority")
async def override_sos_priority(
    sos_id: str,
    req: SOSOverrideRequest,
    db: AsyncSession = Depends(get_db),
):
    """Human dispatcher override of AI-calculated priority."""
    result = await db.execute(select(DBSOSRequest).where(DBSOSRequest.id == sos_id))
    sos = result.scalar_one_or_none()
    if not sos:
        raise HTTPException(404, "SOS request not found")

    sos.priority_level      = req.priority_level
    sos.dispatcher_override = True
    sos.override_by         = req.override_by
    if req.reason:
        existing = json_loads_safe(sos.priority_reason)
        existing.insert(0, f"⚑ DISPATCHER OVERRIDE by {req.override_by}: {req.reason}")
        sos.priority_reason = json.dumps(existing)
    sos.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sos)

    sos_dict = sos_to_dict(sos)
    await manager.broadcast(WSEvent.SOS_PRIORITY_CHANGED, {"sos": sos_dict})
    return sos_dict


@app.patch("/api/sos/{sos_id}/status")
async def update_sos_status(
    sos_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DBSOSRequest).where(DBSOSRequest.id == sos_id))
    sos = result.scalar_one_or_none()
    if not sos:
        raise HTTPException(404, "SOS request not found")
    sos.status = body.get("status", sos.status)
    sos.assigned_responder = body.get("assigned_responder", sos.assigned_responder)
    sos.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sos)
    sos_dict = sos_to_dict(sos)
    await manager.broadcast(WSEvent.SOS_STATUS_CHANGED, {"sos": sos_dict})
    return sos_dict


# ─── RESPONDERS ──────────────────────────────────────────────────────────────

@app.get("/api/responders")
async def list_responders(db: AsyncSession = Depends(get_db)):
    return await get_all_responders(db)


@app.post("/api/responders", status_code=201)
async def register_responder(
    req: ResponderCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate code
    existing = await db.execute(
        select(DBResponder).where(DBResponder.responder_code == req.responder_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Responder code '{req.responder_code}' already registered")

    r = await create_responder(db, req.model_dump())
    rd = responder_to_dict(r)
    await manager.broadcast(WSEvent.RESPONDER_UPDATED, {"responder": rd})
    return rd


@app.get("/api/responders/{responder_id}")
async def get_responder_detail(responder_id: str, db: AsyncSession = Depends(get_db)):
    r = await get_responder(db, responder_id)
    if not r:
        raise HTTPException(404, "Responder not found")
    return responder_to_dict(r)


@app.patch("/api/responders/{responder_id}/location")
async def update_location(
    responder_id: str,
    req: ResponderLocationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Receive GPS telemetry from an EN_ROUTE responder. Throttled client-side to 2-5 s."""
    r = await update_responder_location(
        db, responder_id,
        req.latitude, req.longitude,
        req.accuracy, req.heading, req.speed, req.incident_id,
    )
    if not r:
        raise HTTPException(404, "Responder not found")

    payload = {
        "responderId": responder_id,
        "latitude":   req.latitude,
        "longitude":  req.longitude,
        "heading":    req.heading,
        "speed":      req.speed,
        "accuracy":   req.accuracy,
        "incidentId": req.incident_id,
        "timestamp":  _now_str(),
    }
    await manager.broadcast(WSEvent.RESPONDER_LOCATION, payload)
    return {"ok": True, "responderId": responder_id, **payload}


@app.get("/api/responders/{responder_id}/missions")
async def get_missions(responder_id: str, db: AsyncSession = Depends(get_db)):
    return await get_responder_missions(db, responder_id)


@app.post("/api/responders/{responder_id}/missions", status_code=201)
async def create_responder_mission(
    responder_id: str,
    req: MissionCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    r = await get_responder(db, responder_id)
    if not r:
        raise HTTPException(404, "Responder not found")

    m = await create_mission(
        db, responder_id,
        req.incident_id, req.dest_lat, req.dest_lon,
        req.eta_minutes, req.distance_km, req.notes or "", req.assigned_by or "SYSTEM",
    )
    md = mission_to_dict(m)
    await manager.broadcast(WSEvent.RESPONDER_DISPATCHED, {
        "responderId": responder_id,
        "mission": md,
    })
    return md


@app.patch("/api/missions/{mission_id}/status")
async def update_mission(
    mission_id: str,
    req: MissionStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    m = await update_mission_status(db, mission_id, req.status)
    if not m:
        raise HTTPException(404, "Mission not found")
    md = mission_to_dict(m)
    await manager.broadcast(WSEvent.RESPONDER_UPDATED, {"mission": md})
    return md


@app.get("/api/responders/nearby")
async def nearby_responders(
    lat: float,
    lon: float,
    skills: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    skill_list = [s.strip() for s in skills.split(",")] if skills else []
    return await get_nearby_available_responders(db, lat, lon, skill_list)


@app.get("/api/volunteers/analysis")
@app.get("/api/responders/analysis")
async def volunteer_analysis(db: AsyncSession = Depends(get_db)):
    """Return volunteer and first responder operational analytics and fleet readiness."""
    return await get_volunteer_system_analysis(db)


@app.post("/api/volunteers/match")
@app.post("/api/responders/match")
async def match_volunteers(
    req: VolunteerMatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Rank volunteers/responders for a given incident based on skills, proximity, availability, and workload."""
    return await match_volunteers_for_incident(
        db,
        incident_id=req.incident_id,
        lat=req.latitude,
        lon=req.longitude,
        hazard_category=req.hazard_category,
        severity=req.severity,
        max_results=req.max_results or 5,
    )


@app.get("/api/volunteers/match")
@app.get("/api/responders/match")
async def match_volunteers_get(
    incident_id: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    hazard: Optional[str] = None,
    severity: Optional[str] = None,
    max_results: int = 5,
    db: AsyncSession = Depends(get_db),
):
    """GET query version of volunteer matching."""
    return await match_volunteers_for_incident(
        db,
        incident_id=incident_id,
        lat=lat,
        lon=lon,
        hazard_category=hazard,
        severity=severity,
        max_results=max_results,
    )


@app.get("/api/missions")
async def list_all_missions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical missions log across all responders."""
    return await get_all_missions(db, limit)



# ─── LIVE FEEDS ──────────────────────────────────────────────────────────────

@app.get("/api/feeds")
async def list_feeds(db: AsyncSession = Depends(get_db)):
    """Return currently LIVE or STARTING feeds."""
    result = await db.execute(
        select(DBLiveFeed)
        .where(DBLiveFeed.status.in_(["STARTING", "LIVE", "RECONNECTING"]))
        .order_by(desc(DBLiveFeed.started_at))
    )
    return [feed_to_dict(f) for f in result.scalars().all()]


@app.post("/api/feeds", status_code=201)
async def register_feed(req: FeedRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Called by a responder when they start their camera broadcast."""
    # Optional: validate responder role here
    feed = DBLiveFeed(
        responder_id = req.responder_id,
        incident_id  = req.incident_id or "",
        peer_room_id = req.peer_room_id,
        status       = "STARTING",
        latitude     = req.latitude,
        longitude    = req.longitude,
    )
    db.add(feed)
    await db.commit()
    await db.refresh(feed)

    fd = feed_to_dict(feed)
    await manager.broadcast(WSEvent.FEED_STARTED, {"feed": fd})
    logger.info(f"[Feed] Registered feed {feed.id} for room {req.peer_room_id}")
    return fd


@app.patch("/api/feeds/{feed_id}")
async def update_feed(
    feed_id: str,
    req: FeedStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DBLiveFeed).where(DBLiveFeed.id == feed_id))
    feed = result.scalar_one_or_none()
    if not feed:
        raise HTTPException(404, "Feed not found")

    feed.status    = req.status
    feed.last_seen = datetime.now(timezone.utc)
    if req.viewer_count is not None:
        feed.viewer_count = req.viewer_count
    if req.latitude is not None:
        feed.latitude = req.latitude
    if req.longitude is not None:
        feed.longitude = req.longitude
    if req.heading is not None:
        feed.heading = req.heading
    if req.speed is not None:
        feed.speed = req.speed
    if req.status == "ENDED":
        feed.ended_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(feed)
    fd = feed_to_dict(feed)
    ev = WSEvent.FEED_STOPPED if req.status == "ENDED" else WSEvent.FEED_STATUS_CHANGED
    await manager.broadcast(ev, {"feed": fd})
    return fd


# ─── ICE SERVER CONFIG (WebRTC) ──────────────────────────────────────────────

@app.get("/api/ice-servers")
async def get_ice_servers():
    """
    Returns ICE server config to the frontend for WebRTC.
    TURN credentials are kept server-side and never exposed in frontend source.
    """
    servers = [
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:global.stun.twilio.com:3478"},
    ]
    if TURN_URL:
        servers.append({
            "urls":       TURN_URL,
            "username":   TURN_USERNAME,
            "credential": TURN_CREDENTIAL,
        })
    return {"iceServers": servers}


# ─── EMERGENCY REPORT FORWARDING & TEST RECEIVER ────────────────────────────
from backend.models import EmergencyForwardRequest, EmergencyForwardingStatus, EmergencyForwardingAttempt
from backend.emergency_report import (
    get_endpoint_mode, forward_incident, get_history, get_all_history, build_emergency_report
)

_test_receiver_log: list[dict] = []

@app.post("/api/dev/test-receiver")
async def dev_test_receiver(report: dict):
    """Local development test endpoint mimicking a real emergency authority receiver."""
    import uuid
    ref_id = f"TEST-RCV-{uuid.uuid4().hex[:8].upper()}"
    received_at = _now_str()
    entry = {
        "reference_id": ref_id,
        "received_at": received_at,
        "report_id": report.get("report_id"),
        "incident_id": report.get("incident_id"),
        "hazard_category": report.get("hazard", {}).get("category"),
        "severity": report.get("hazard", {}).get("severity"),
        "priority": report.get("priority", {}).get("level"),
        "location": report.get("location"),
        "full_report": report,
    }
    _test_receiver_log.insert(0, entry)
    logger.info(f"[TestReceiver] Received report for {report.get('incident_id')} -> {ref_id}")
    return {
        "status": "accepted",
        "system": "ResQMap-Dev-Test-Receiver",
        "reference_id": ref_id,
        "received_at": received_at,
        "note": "LOCAL DEV TEST RECEIVER. Real format verified.",
    }

@app.get("/api/dev/test-receiver/logs")
async def get_test_receiver_logs():
    return {
        "count": len(_test_receiver_log),
        "entries": _test_receiver_log,
    }

@app.delete("/api/dev/test-receiver/logs")
async def clear_test_receiver_logs():
    _test_receiver_log.clear()
    return {"status": "cleared"}

@app.get("/api/emergency-reports/config")
async def get_forwarding_config():
    import os
    mode = get_endpoint_mode()
    label = os.environ.get("EMERGENCY_REPORT_DESTINATION_LABEL", "").strip() or "National Emergency Dispatch Mesh (NDMA / SEOC / 112)"
    recipients_raw = os.environ.get("EMERGENCY_ALERT_RECIPIENTS", "").strip()
    recipients = [r.strip() for r in recipients_raw.split(",") if r.strip()] or [
        "ndma.alerts@gov.in", "seoc.controlroom@gov.in", "rescue-dispatch@112.gov.in"
    ]
    return {
        "endpoint_mode": mode,
        "transport_type": "SMTP_EMAIL",
        "destination_label": label,
        "recipients": recipients,
    }


@app.post("/api/emergency-reports/{incident_id}/forward")
async def forward_emergency_report(
    incident_id: str,
    body: EmergencyForwardRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DBIncident).where(DBIncident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(
            status_code=404,
            detail=f"Incident '{incident_id}' not found in database. Use POST /api/emergency-reports/forward-with-data for client-side incidents.",
        )
    incident_dict = incident_to_dict(inc)
    attempt = await forward_incident(
        incident=incident_dict,
        operator_notes=body.operator_notes,
        is_retry=body.is_retry,
    )
    event_type = "EMERGENCY_REPORT_SENT" if attempt.status == EmergencyForwardingStatus.SENT else "EMERGENCY_REPORT_FAILED"
    await manager.broadcast(event_type, {
        "incident_id": incident_id,
        "attempt_id": attempt.attempt_id,
        "status": attempt.status,
        "destination_label": attempt.destination_label,
        "attempted_at": attempt.attempted_at,
    })
    return attempt.model_dump()

@app.post("/api/emergency-reports/forward-with-data")
@app.post("/api/emergency/forward")
async def forward_with_data(body: dict):
    incident = body.get("incident") or body
    operator_notes = body.get("operator_notes")
    is_retry = body.get("is_retry", False)

    if not incident or not isinstance(incident, dict):
        raise HTTPException(status_code=400, detail="'incident' object is required.")

    incident_id = incident.get("id") or incident.get("incident_id") or f"INC-{_now_str()}"
    if not incident.get("id"):
        incident["id"] = incident_id

    attempt = await forward_incident(
        incident=incident,
        operator_notes=operator_notes,
        is_retry=is_retry,
    )

    event_type = "EMERGENCY_REPORT_SENT" if attempt.status == EmergencyForwardingStatus.SENT else "EMERGENCY_REPORT_FAILED"
    await manager.broadcast(event_type, {
        "incident_id": incident_id,
        "attempt_id": attempt.attempt_id,
        "status": attempt.status,
        "destination_label": attempt.destination_label,
        "attempted_at": attempt.attempted_at,
    })
    return attempt.model_dump()

@app.get("/api/emergency-reports/{incident_id}/history")
async def get_forwarding_history(incident_id: str):
    attempts = get_history(incident_id)
    return [a.model_dump() for a in attempts]

@app.get("/api/emergency-reports/history/all")
async def get_all_forwarding_history():
    attempts = get_all_history()
    return [a.model_dump() for a in attempts]

@app.get("/api/emergency-reports/{incident_id}/report-preview")
async def preview_report(incident_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBIncident).where(DBIncident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found in database.")
    return build_emergency_report(incident_to_dict(inc))



# ─── WEBSOCKET ───────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    # Send current health on connect so client can verify it's on the right host
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        lan_ip = "unknown"

    await manager.send_to(ws, WSEvent.HEALTH, {
        "node": NODE_ID,
        "lan_ip": lan_ip,
        "timestamp": _now_str(),
    })

    try:
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                if msg_type == "PING":
                    await manager.send_to(ws, "PONG", {"timestamp": _now_str()})
                elif msg_type in ("LIVE_FEED_FRAME", "WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE", "STREAM_REQUEST"):
                    await manager.broadcast(msg_type, msg)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(ws)
