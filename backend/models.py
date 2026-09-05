from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class HazardCategory(str, Enum):
    FLOOD = 'Flood / Waterlogging'
    STRUCTURAL = 'Structural Damage / Building Collapse'
    FIRE = 'Fire / Wildfire / Smoke'
    LANDSLIDE = 'Landslide / Mudslide'
    ELECTRICAL = 'Downed Powerlines / Electrical Hazard'
    ROAD_BLOCK = 'Road Obstruction / Debris'
    OTHER = 'Other Hazard'

class SeverityLevel(str, Enum):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'

class IncidentStatus(str, Enum):
    PENDING = 'PENDING'
    VERIFIED = 'VERIFIED'
    DISPATCHED = 'DISPATCHED'
    EN_ROUTE = 'EN_ROUTE'
    ON_SCENE = 'ON_SCENE'
    RESOLVED = 'RESOLVED'
    FLAGGED_FALSE_ALARM = 'FLAGGED_FALSE_ALARM'

class AIAnalysisResult(BaseModel):
    hazard_category: HazardCategory
    severity: SeverityLevel
    confidence: float = Field(..., ge=0.0, le=1.0, description='Classification confidence score (0-1)')
    is_real_disaster: bool = Field(..., description='True if real emergency, False if false alarm/hoax/normal scene')
    authenticity_score: float = Field(..., ge=0.0, le=100.0, description='Authenticity confidence (0-100)')
    false_alarm_reason: Optional[str] = None
    visual_features: List[str] = Field(default_factory=list, description='Key visual features that drove the classification')
    recommended_units: List[str] = Field(default_factory=list, description='Recommended first responder unit types')
    damage_assessment: str = Field('', description='Short descriptive summary of visual damage')
    safety_instructions: List[str] = Field(default_factory=list, description='Immediate survival/safety recommendations for victims')

class IncidentCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    reporter_name: Optional[str] = 'Anonymous Citizen'
    reporter_phone: Optional[str] = None
    trapped_count: int = 0
    needs_medical: bool = False
    needs_boat: bool = False
    has_elderly_or_infants: bool = False
    notes: Optional[str] = None

class Incident(BaseModel):
    id: str
    created_at: str
    updated_at: str
    latitude: float
    longitude: float
    address: str
    image_url: str
    thumbnail_url: Optional[str] = None
    hazard_category: HazardCategory
    severity: SeverityLevel
    status: IncidentStatus
    is_real_disaster: bool
    authenticity_score: float
    confidence: float
    visual_features: List[str]
    recommended_units: List[str]
    damage_assessment: str
    safety_instructions: List[str]
    reporter_name: str
    reporter_phone: Optional[str] = None
    trapped_count: int = 0
    needs_medical: bool = False
    needs_boat: bool = False
    has_elderly_or_infants: bool = False
    notes: Optional[str] = None
    assigned_unit: Optional[str] = None
    responder_eta_minutes: Optional[int] = None
    responder_distance_km: Optional[float] = None
    responder_notes: Optional[str] = None

class DispatchUpdate(BaseModel):
    status: IncidentStatus
    assigned_unit: Optional[str] = None
    responder_eta_minutes: Optional[int] = None
    responder_notes: Optional[str] = None

class LiveClassificationRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    api_key: Optional[str] = None

class APIKeyConfig(BaseModel):
    api_key: str

# ----------------------------------------------------
# Feature 1: Emergency Contacts Schema
# ----------------------------------------------------
class EmergencyContact(BaseModel):
    id: str
    name: str
    number: str
    description: str
    category: str
    icon_name: Optional[str] = "Phone"
    badge_color: Optional[str] = "rose"
    priority: Optional[str] = "HIGH"
    open_24x7: bool = True
    website: Optional[str] = None
    is_default: bool = True

# ----------------------------------------------------
# Feature 2: Volunteer Hub Schemas
# ----------------------------------------------------
class VolunteerStatus(str, Enum):
    AVAILABLE = 'AVAILABLE'
    BUSY = 'BUSY'
    OFFLINE = 'OFFLINE'

class VolunteerProfile(BaseModel):
    name: str
    phone: str
    location_name: str
    latitude: float
    longitude: float
    skills: List[str] = Field(default_factory=list)
    availability: VolunteerStatus = VolunteerStatus.AVAILABLE
    vehicle_available: bool = False
    vehicle_type: Optional[str] = None
    first_aid_trained: bool = False
    equipment: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    preferred_task_types: List[str] = Field(default_factory=list)

class VolunteerTask(BaseModel):
    id: str
    incident_id: str
    title: str
    category: str
    priority: str
    latitude: float
    longitude: float
    address: str
    required_skills: List[str] = Field(default_factory=list)
    people_affected: int = 5
    impact_points: int = 10
    estimated_duration: str = "30 min"
    status: str = "AVAILABLE" # AVAILABLE | ACCEPTED | IN_PROGRESS | COMPLETED
    description: str
    urgency: str = "NORMAL"
    equipment_needed: Optional[str] = None

class VolunteerImpact(BaseModel):
    score: int = 0
    tasks_completed: int = 0
    people_assisted: int = 0
    rank_title: str = "Certified Volunteer Scout"
    badge_level: str = "SILVER"
    history: List[Dict[str, Any]] = Field(default_factory=list)

# ----------------------------------------------------
# Feature 3: SafeHouse Relief Shelters Schema
# ----------------------------------------------------
class SafeHouseStatus(str, Enum):
    OPEN = 'OPEN'
    LIMITED = 'LIMITED'
    FULL = 'FULL'
    CLOSED = 'CLOSED'
    EVACUATING = 'EVACUATING'

class SafeHouse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    address: str
    city: Optional[str] = None
    capacity: int
    current_occupancy: int = 0
    available_beds: int
    accessibility: bool = True
    medical_support: bool = True
    food_available: bool = True
    water_available: bool = True
    open_24x7: bool = True
    status: SafeHouseStatus = SafeHouseStatus.OPEN
    contact_phone: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    is_demo_data: bool = True

# ----------------------------------------------------
# Feature 4: Emergency Report Forwarding
# ----------------------------------------------------
class EmergencyForwardingStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    PENDING        = "PENDING"
    SENDING        = "SENDING"
    SENT           = "SENT"
    FAILED         = "FAILED"
    RETRY_REQUIRED = "RETRY_REQUIRED"

class EmergencyForwardingAttempt(BaseModel):
    attempt_id: str
    incident_id: str
    destination_label: Optional[str] = None
    attempted_at: str
    status: EmergencyForwardingStatus
    http_status_code: Optional[int] = None
    external_reference_id: Optional[str] = None
    failure_category: Optional[str] = None
    sanitized_error: Optional[str] = None
    report_id: str

class EmergencyForwardRequest(BaseModel):
    destination_label: Optional[str] = None
    operator_notes: Optional[str] = None
    is_retry: bool = False

