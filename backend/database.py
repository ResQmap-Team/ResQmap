"""
ResQMap AI — Database Layer
Uses SQLAlchemy async with aiosqlite (SQLite by default).
Switch to PostgreSQL by setting DATABASE_URL in .env.

Tables created here:
  incidents        — disaster incident records
  sos_requests     — SOS victim requests with triage priority
  responders       — volunteer / first responder registry
  missions         — mission/dispatch history per responder
  gps_telemetry    — responder GPS location history
  live_feeds       — live camera feed session registry
  incident_events  — status history / event log per incident
"""
import uuid
import json
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, String, Text,
    ForeignKey, Enum as SAEnum, UniqueConstraint
)
from sqlalchemy.ext.asyncio import (
    AsyncSession, async_sessionmaker, create_async_engine
)
from sqlalchemy.orm import DeclarativeBase, relationship

from backend.config import DATABASE_URL


# ─── Engine & Session ─────────────────────────────────────────────────────────
_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


# ─── Base ─────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


def _now() -> datetime:
    return datetime.utcnow()


def _uuid() -> str:
    return str(uuid.uuid4())


# ─── ORM Models ───────────────────────────────────────────────────────────────

class DBIncident(Base):
    __tablename__ = "incidents"

    id            = Column(String, primary_key=True, default=_uuid)
    created_at    = Column(DateTime, default=_now)
    updated_at    = Column(DateTime, default=_now, onupdate=_now)

    latitude      = Column(Float, nullable=False)
    longitude     = Column(Float, nullable=False)
    address       = Column(String, default="")

    title         = Column(String, default="")
    description   = Column(Text, default="")

    image_url     = Column(Text, default="")
    image_base64  = Column(Text, default="")   # stored if no external URL

    reporter_name  = Column(String, default="Anonymous Citizen")
    reporter_phone = Column(String, default="")

    # AI classification
    hazard_category  = Column(String, default="Other Hazard")
    severity         = Column(String, default="MEDIUM")
    confidence       = Column(Float, default=0.0)
    is_real_disaster = Column(Boolean, default=True)
    authenticity_score = Column(Float, default=0.0)
    false_alarm_reason = Column(Text, default="")
    visual_features    = Column(Text, default="[]")   # JSON array
    recommended_units  = Column(Text, default="[]")   # JSON array
    damage_assessment  = Column(Text, default="")
    safety_instructions = Column(Text, default="[]")  # JSON array

    # Victim info
    trapped_count         = Column(Integer, default=0)
    needs_medical         = Column(Boolean, default=False)
    needs_boat            = Column(Boolean, default=False)
    has_elderly_or_infants = Column(Boolean, default=False)
    notes                 = Column(Text, default="")

    # Status
    status        = Column(String, default="PENDING")
    priority      = Column(String, default="P2")   # P0/P1/P2/P3

    # Dispatch
    assigned_unit            = Column(String, default="")
    responder_eta_minutes    = Column(Integer, default=None)
    responder_distance_km    = Column(Float, default=None)
    responder_notes          = Column(Text, default="")

    # Corroboration
    is_corroborated            = Column(Boolean, default=False)
    corroborated_reports_count = Column(Integer, default=1)
    affected_radius_meters     = Column(Float, default=80.0)

    # Relationships
    events    = relationship("DBIncidentEvent", back_populates="incident",
                             cascade="all, delete-orphan")
    sos_requests = relationship("DBSOSRequest", back_populates="incident")


class DBIncidentEvent(Base):
    __tablename__ = "incident_events"

    id          = Column(String, primary_key=True, default=_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    event_time  = Column(DateTime, default=_now)
    text        = Column(Text, nullable=False)

    incident = relationship("DBIncident", back_populates="events")


class DBSOSRequest(Base):
    __tablename__ = "sos_requests"

    id          = Column(String, primary_key=True, default=_uuid)
    created_at  = Column(DateTime, default=_now)
    updated_at  = Column(DateTime, default=_now, onupdate=_now)

    incident_id = Column(String, ForeignKey("incidents.id"), nullable=True)

    # Victim location
    latitude    = Column(Float, nullable=False)
    longitude   = Column(Float, nullable=False)

    # Victim info
    reporter_name   = Column(String, default="Unknown")
    reporter_phone  = Column(String, default="")
    trapped_count   = Column(Integer, default=0)
    needs_medical   = Column(Boolean, default=False)
    has_elderly_or_infants = Column(Boolean, default=False)
    victim_notes    = Column(Text, default="")

    # Calculated priority
    priority_score  = Column(Float, default=0.0)   # 0-100, higher = more urgent
    priority_level  = Column(String, default="P2") # P0/P1/P2/P3
    priority_reason = Column(Text, default="[]")   # JSON array of reason strings

    # Distance to nearest disaster epicenter (meters)
    distance_to_epicenter_m = Column(Float, default=None)
    nearest_incident_id     = Column(String, default="")

    # Status
    status              = Column(String, default="ACTIVE")  # ACTIVE/DISPATCHED/RESOLVED
    assigned_responder  = Column(String, default="")
    dispatcher_override = Column(Boolean, default=False)
    override_by         = Column(String, default="")

    incident = relationship("DBIncident", back_populates="sos_requests")


class DBResponder(Base):
    __tablename__ = "responders"

    id          = Column(String, primary_key=True, default=_uuid)
    created_at  = Column(DateTime, default=_now)

    # Identity
    responder_code = Column(String, unique=True, nullable=False)  # e.g. "FR-017"
    name           = Column(String, nullable=False)
    unit           = Column(String, default="")
    vehicle        = Column(String, default="")
    role           = Column(String, default="VOLUNTEER")  # VOLUNTEER/PROFESSIONAL_RESPONDER/COMMANDER

    # Skills (comma-separated)
    skills         = Column(Text, default="")
    certifications = Column(Text, default="")

    # Current state
    status         = Column(String, default="AVAILABLE")  # AVAILABLE/ASSIGNED/EN_ROUTE/ON_SCENE/OFF_DUTY/UNAVAILABLE
    current_latitude  = Column(Float, default=None)
    current_longitude = Column(Float, default=None)
    current_incident_id = Column(String, default="")

    # Contact
    phone          = Column(String, default="")
    email          = Column(String, default="")

    # Relationships
    missions = relationship("DBMission", back_populates="responder",
                            cascade="all, delete-orphan")
    telemetry = relationship("DBGPSTelemetry", back_populates="responder",
                             cascade="all, delete-orphan")


class DBMission(Base):
    __tablename__ = "missions"

    id           = Column(String, primary_key=True, default=_uuid)
    responder_id = Column(String, ForeignKey("responders.id"), nullable=False)
    incident_id  = Column(String, ForeignKey("incidents.id"), nullable=True)

    # Timestamps
    assigned_at    = Column(DateTime, default=_now)
    dispatched_at  = Column(DateTime, default=None)
    en_route_at    = Column(DateTime, default=None)
    on_scene_at    = Column(DateTime, default=None)
    resolved_at    = Column(DateTime, default=None)
    cancelled_at   = Column(DateTime, default=None)

    # Mission details
    status           = Column(String, default="ASSIGNED")  # ASSIGNED/DISPATCHED/EN_ROUTE/ON_SCENE/RESOLVED/CANCELLED
    destination_lat  = Column(Float, default=None)
    destination_lon  = Column(Float, default=None)
    eta_minutes      = Column(Integer, default=None)
    distance_km      = Column(Float, default=None)
    notes            = Column(Text, default="")
    assigned_by      = Column(String, default="SYSTEM")

    # Computed after completion
    response_time_minutes = Column(Integer, default=None)  # assigned → on_scene
    mission_duration_minutes = Column(Integer, default=None)  # on_scene → resolved
    distance_travelled_km = Column(Float, default=None)

    responder = relationship("DBResponder", back_populates="missions")


class DBGPSTelemetry(Base):
    __tablename__ = "gps_telemetry"

    id           = Column(String, primary_key=True, default=_uuid)
    responder_id = Column(String, ForeignKey("responders.id"), nullable=False)
    incident_id  = Column(String, default="")

    timestamp  = Column(DateTime, default=_now)
    latitude   = Column(Float, nullable=False)
    longitude  = Column(Float, nullable=False)
    accuracy   = Column(Float, default=None)   # meters
    heading    = Column(Float, default=None)   # degrees 0-360
    speed      = Column(Float, default=None)   # m/s

    responder = relationship("DBResponder", back_populates="telemetry")


class DBLiveFeed(Base):
    __tablename__ = "live_feeds"

    id           = Column(String, primary_key=True, default=_uuid)
    responder_id = Column(String, ForeignKey("responders.id"), nullable=True)
    incident_id  = Column(String, default="")

    started_at  = Column(DateTime, default=_now)
    last_seen   = Column(DateTime, default=_now)
    ended_at    = Column(DateTime, default=None)

    status       = Column(String, default="STARTING")  # STARTING/LIVE/RECONNECTING/OFFLINE/ENDED
    peer_room_id = Column(String, default="")
    viewer_count = Column(Integer, default=0)

    # Last known location
    latitude   = Column(Float, default=None)
    longitude  = Column(Float, default=None)
    heading    = Column(Float, default=None)
    speed      = Column(Float, default=None)


# ─── Init ─────────────────────────────────────────────────────────────────────
async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ─── JSON helpers ─────────────────────────────────────────────────────────────
def json_loads_safe(s: str) -> list:
    try:
        return json.loads(s) if s else []
    except Exception:
        return []


def incident_to_dict(inc: DBIncident) -> dict:
    """Convert a DBIncident ORM object to a frontend-compatible dict."""
    events = [
        {"time": e.event_time.strftime("%I:%M %p"), "text": e.text}
        for e in sorted(inc.events, key=lambda x: x.event_time)
    ]
    return {
        "id": inc.id,
        "createdAt": inc.created_at.isoformat() + "Z" if inc.created_at else "",
        "updatedAt": inc.updated_at.isoformat() + "Z" if inc.updated_at else "",
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "address": inc.address or "",
        "title": inc.title or "",
        "description": inc.description or "",
        "imageUrl": inc.image_url or "",
        "hazardCategory": inc.hazard_category,
        "severity": inc.severity,
        "priority": inc.priority,
        "status": inc.status,
        "isRealDisaster": inc.is_real_disaster,
        "authenticityScore": inc.authenticity_score,
        "confidence": inc.confidence,
        "falseAlarmReason": inc.false_alarm_reason or None,
        "visualFeatures": json_loads_safe(inc.visual_features),
        "recommendedUnits": json_loads_safe(inc.recommended_units),
        "damageAssessment": inc.damage_assessment or "",
        "safetyInstructions": json_loads_safe(inc.safety_instructions),
        "reporterName": inc.reporter_name or "Anonymous Citizen",
        "reporterPhone": inc.reporter_phone or None,
        "trappedCount": inc.trapped_count,
        "needsMedical": inc.needs_medical,
        "needsBoat": inc.needs_boat,
        "hasElderlyOrInfants": inc.has_elderly_or_infants,
        "notes": inc.notes or "",
        "assignedUnit": inc.assigned_unit or None,
        "responderEtaMinutes": inc.responder_eta_minutes,
        "responderDistanceKm": inc.responder_distance_km,
        "responderNotes": inc.responder_notes or "",
        "isCorroborated": inc.is_corroborated,
        "corroboratedReportsCount": inc.corroborated_reports_count,
        "affectedRadiusMeters": inc.affected_radius_meters,
        "eventsTimeline": events,
    }


def sos_to_dict(sos: DBSOSRequest) -> dict:
    return {
        "id": sos.id,
        "createdAt": sos.created_at.isoformat() + "Z" if sos.created_at else "",
        "incidentId": sos.incident_id or None,
        "latitude": sos.latitude,
        "longitude": sos.longitude,
        "reporterName": sos.reporter_name,
        "reporterPhone": sos.reporter_phone,
        "trappedCount": sos.trapped_count,
        "needsMedical": sos.needs_medical,
        "hasElderlyOrInfants": sos.has_elderly_or_infants,
        "victimNotes": sos.victim_notes,
        "priorityScore": sos.priority_score,
        "priorityLevel": sos.priority_level,
        "priorityReason": json_loads_safe(sos.priority_reason),
        "distanceToEpicenterM": sos.distance_to_epicenter_m,
        "nearestIncidentId": sos.nearest_incident_id,
        "status": sos.status,
        "assignedResponder": sos.assigned_responder,
        "dispatcherOverride": sos.dispatcher_override,
    }


def responder_to_dict(r: DBResponder) -> dict:
    return {
        "id": r.id,
        "responderCode": r.responder_code,
        "name": r.name,
        "unit": r.unit,
        "vehicle": r.vehicle,
        "role": r.role,
        "skills": [s.strip() for s in r.skills.split(",") if s.strip()] if r.skills else [],
        "certifications": [s.strip() for s in r.certifications.split(",") if s.strip()] if r.certifications else [],
        "status": r.status,
        "currentLatitude": r.current_latitude,
        "currentLongitude": r.current_longitude,
        "currentIncidentId": r.current_incident_id or None,
        "phone": r.phone,
        "email": r.email,
    }


def mission_to_dict(m: DBMission) -> dict:
    def _iso(dt):
        return dt.isoformat() + "Z" if dt else None

    return {
        "id": m.id,
        "responderId": m.responder_id,
        "incidentId": m.incident_id,
        "status": m.status,
        "assignedAt": _iso(m.assigned_at),
        "dispatchedAt": _iso(m.dispatched_at),
        "enRouteAt": _iso(m.en_route_at),
        "onSceneAt": _iso(m.on_scene_at),
        "resolvedAt": _iso(m.resolved_at),
        "cancelledAt": _iso(m.cancelled_at),
        "etaMinutes": m.eta_minutes,
        "distanceKm": m.distance_km,
        "notes": m.notes,
        "assignedBy": m.assigned_by,
        "responseTimeMinutes": m.response_time_minutes,
        "missionDurationMinutes": m.mission_duration_minutes,
    }


def feed_to_dict(f: DBLiveFeed) -> dict:
    def _iso(dt):
        return dt.isoformat() + "Z" if dt else None
    return {
        "id": f.id,
        "responderId": f.responder_id,
        "incidentId": f.incident_id,
        "startedAt": _iso(f.started_at),
        "lastSeen": _iso(f.last_seen),
        "status": f.status,
        "peerRoomId": f.peer_room_id,
        "viewerCount": f.viewer_count,
        "latitude": f.latitude,
        "longitude": f.longitude,
        "heading": f.heading,
        "speed": f.speed,
    }
