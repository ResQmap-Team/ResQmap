"""
emergency_report.py — Emergency / Government Report Outbound Notification Engine
=================================================================================

Architecture:
  - SmtpEmergencyReportProvider: Standard SMTP email outbound dispatch to authorities (NDMA, SEOC, 112)
  - build_emergency_report():    Maps existing Incident dict -> structured JSON report
  - forward_incident():          Orchestrates validation, dispatch delivery, and audit history
  - In-memory attempt history (keyed by incident_id)

Security rules enforced here:
  - SMTP credentials (host, username, password) are read from backend env ONLY.
  - NEVER exposed to the frontend or included in client payloads.
  - Sanitized error messages are returned to the frontend.
  - NO webhooks, NO incoming webhooks, NO ngrok.
"""

import os
import uuid
import socket
import logging
import asyncio
import smtplib
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional
from collections import defaultdict
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from backend.models import EmergencyForwardingStatus, EmergencyForwardingAttempt
except ImportError:
    from models import EmergencyForwardingStatus, EmergencyForwardingAttempt

logger = logging.getLogger("resqmap.emergency_report")

# ─────────────────────────────────────────────────────────────────────────────
# In-memory forwarding attempt store
# Key: incident_id  →  List[EmergencyForwardingAttempt]
# ─────────────────────────────────────────────────────────────────────────────
_forwarding_history: dict[str, list[EmergencyForwardingAttempt]] = defaultdict(list)


def get_history(incident_id: str) -> list[EmergencyForwardingAttempt]:
    return list(_forwarding_history.get(incident_id, []))


def get_all_history() -> list[EmergencyForwardingAttempt]:
    all_attempts = []
    for attempts in _forwarding_history.values():
        all_attempts.extend(attempts)
    all_attempts.sort(key=lambda a: a.attempted_at, reverse=True)
    return all_attempts


def _store_attempt(attempt: EmergencyForwardingAttempt) -> None:
    _forwarding_history[attempt.incident_id].append(attempt)


# ─────────────────────────────────────────────────────────────────────────────
# Report builder
# Maps the existing Incident dict to the structured format for emergency teams
# ─────────────────────────────────────────────────────────────────────────────
def build_emergency_report(incident: dict, operator_notes: Optional[str] = None) -> dict:
    """
    Build a structured emergency report from an existing incident record.
    All fields are pulled from the incident; missing fields are null.
    """
    return {
        "source": "ResQMap",
        "schema_version": "1.0",
        "incident_id": incident.get("id"),
        "report_timestamp": datetime.now(timezone.utc).isoformat(),
        "operator_notes": operator_notes or None,

        "hazard": {
            "type": incident.get("hazardCategory") or incident.get("hazard_category"),
            "severity": incident.get("severity"),
            "priority": incident.get("priority"),
            "confidence": incident.get("confidence"),
            "damage_assessment": incident.get("damageAssessment") or incident.get("damage_assessment"),
            "visual_features": incident.get("visualFeatures") or incident.get("visual_features") or [],
            "recommended_units": incident.get("recommendedUnits") or incident.get("recommended_units") or [],
            "safety_instructions": incident.get("safetyInstructions") or incident.get("safety_instructions") or [],
        },

        "verification": {
            "status": "VERIFIED" if incident.get("isRealDisaster") or incident.get("is_real_disaster") else "UNVERIFIED",
            "is_real_disaster": incident.get("isRealDisaster") or incident.get("is_real_disaster"),
            "authenticity_score": incident.get("authenticityScore") or incident.get("authenticity_score"),
            "is_corroborated": incident.get("isCorroborated") or incident.get("is_corroborated"),
            "corroborated_reports_count": incident.get("corroboratedReportsCount") or incident.get("corroborated_reports_count"),
        },

        "location": {
            "latitude": incident.get("latitude"),
            "longitude": incident.get("longitude"),
            "address": incident.get("address"),
            "source": "citizen_gps",
            "accuracy_meters": None,
            "affected_radius_meters": incident.get("affectedRadiusMeters") or incident.get("affected_radius_meters"),
            "location_timestamp": incident.get("createdAt") or incident.get("created_at"),
        },

        "victims": {
            "count": None,
            "trapped": incident.get("trappedCount") or incident.get("trapped_count", 0),
            "medical_urgency": "REQUIRED" if (incident.get("needsMedical") or incident.get("needs_medical")) else "NOT_INDICATED",
            "rescue_boat_required": incident.get("needsBoat") or incident.get("needs_boat", False),
            "vulnerable_persons_present": incident.get("hasElderlyOrInfants") or incident.get("has_elderly_or_infants", False),
            "victim_notes": incident.get("notes"),
        },

        "reporter": {
            "name": incident.get("reporterName") or incident.get("reporter_name", "Anonymous Citizen"),
            "phone": incident.get("reporterPhone") or incident.get("reporter_phone"),
            "description": incident.get("title"),
        },

        "responder": {
            "assigned": bool(incident.get("assignedUnit") or incident.get("assigned_unit")),
            "unit": incident.get("assignedUnit") or incident.get("assigned_unit"),
            "status": incident.get("status"),
            "eta_minutes": incident.get("responderEtaMinutes") or incident.get("responder_eta_minutes"),
            "distance_km": incident.get("responderDistanceKm") or incident.get("responder_distance_km"),
            "notes": incident.get("responderNotes") or incident.get("responder_notes"),
        },

        "evidence": [
            {"type": "image", "url": incident.get("imageUrl") or incident.get("image_url")}
        ] if (incident.get("imageUrl") or incident.get("image_url")) else [],

        "incident_status": incident.get("status"),
        "incident_created_at": incident.get("createdAt") or incident.get("created_at"),
    }


def validate_report(report: dict) -> list[str]:
    """Returns a list of validation errors. Empty list means the report is valid."""
    errors = []
    if not report.get("incident_id"):
        errors.append("incident_id is required")
    if report.get("location", {}).get("latitude") is None:
        errors.append("location.latitude is required")
    if report.get("location", {}).get("longitude") is None:
        errors.append("location.longitude is required")
    if not report.get("hazard", {}).get("type"):
        errors.append("hazard.type is required")
    if report.get("verification", {}).get("is_real_disaster") is False:
        errors.append("incident must be verified as a real disaster before forwarding")
    return errors


# ─────────────────────────────────────────────────────────────────────────────
# Provider interface and SMTP Implementation
# ─────────────────────────────────────────────────────────────────────────────
class EmergencyReportProvider(ABC):
    @abstractmethod
    async def send_report(self, report: dict) -> dict:
        ...

    @property
    @abstractmethod
    def destination_label(self) -> Optional[str]:
        ...


class SmtpEmergencyReportProvider(EmergencyReportProvider):
    """
    Server-side outbound notification transport using standard SMTP.
    Dispatches rich incident telemetry directly to emergency authority inboxes.
    """

    def __init__(
        self,
        host: str,
        port: int = 587,
        username: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
        recipients: Optional[list[str]] = None,
        use_tls: bool = True,
        use_ssl: bool = False,
        timeout: float = 10.0,
        label: Optional[str] = None,
    ):
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._from_email = from_email or username or "alerts@resqmap.local"
        self._recipients = recipients or [
            "ndma.alerts@gov.in", "seoc.controlroom@gov.in", "rescue-dispatch@112.gov.in"
        ]
        self._use_tls = use_tls
        self._use_ssl = use_ssl
        self._timeout = timeout
        self._label = label or "National Emergency Dispatch Mesh (NDMA / SEOC / 112)"

    @property
    def destination_label(self) -> str:
        recipients_str = ", ".join(self._recipients[:2])
        if len(self._recipients) > 2:
            recipients_str += f" (+{len(self._recipients) - 2} more)"
        return f"{self._label} [{recipients_str}]"

    def _format_email_body(self, report: dict, ref_id: str) -> tuple[str, str]:
        """Generate Plain Text and HTML bodies for the dispatch notification."""
        inc_id = report.get("incident_id", "UNKNOWN")
        hazard = report.get("hazard", {})
        loc = report.get("location", {})
        verif = report.get("verification", {})
        victims = report.get("victims", {})
        responder = report.get("responder", {})
        notes = report.get("operator_notes") or "None"

        lat = loc.get("latitude")
        lng = loc.get("longitude")
        maps_link = f"https://www.google.com/maps?q={lat},{lng}" if lat and lng else "N/A"

        plain_text = f"""=====================================================
RESQMAP AI — OFFICIAL EMERGENCY DISPATCH NOTIFICATION
=====================================================
DISPATCH REF:     {ref_id}
INCIDENT ID:      {inc_id}
TIMESTAMP:        {report.get("report_timestamp")}
PRIORITY:         {hazard.get("priority", "P0")} ({hazard.get("severity", "CRITICAL")})
HAZARD PROFILE:   {hazard.get("type", "General Disaster")}
AUTHENTICITY:     {verif.get("authenticity_score", 95)}% AI Verified

LOCATION & TELEMETRY:
---------------------
Address:          {loc.get("address", "Unknown Location")}
Coordinates:      LAT {lat}, LNG {lng}
Map Link:         {maps_link}
Affected Radius:  {loc.get("affected_radius_meters", "Unknown")} meters

VICTIM & SOS INTEL:
-------------------
Trapped Count:    {victims.get("trapped", 0)} personnel
Medical Urgency:  {victims.get("medical_urgency", "NOT_INDICATED")}
Evac Boat Req:    {victims.get("rescue_boat_required", False)}
Vulnerable Pop:   {victims.get("vulnerable_persons_present", False)}
Victim Notes:     {victims.get("victim_notes") or "None"}

FIRST RESPONDER STATUS:
-----------------------
Assigned Unit:    {responder.get("unit") or "UNASSIGNED"}
Status:           {responder.get("status") or "PENDING_DISPATCH"}
ETA / Distance:   {responder.get("eta_minutes", "—")} min / {responder.get("distance_km", "—")} km

OPERATOR INTEL & NOTES:
-----------------------
{notes}

=====================================================
DISPATCHED SECURELY BY RESQMAP TACTICAL COMMAND NODE
=====================================================
"""

        html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0e17; color: #e2e8f0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f293d; border-radius: 12px; padding: 24px;">
    <div style="border-bottom: 2px solid #e11d48; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color: #f43f5e; margin: 0; text-transform: uppercase;">⚠️ EMERGENCY DISPATCH NOTIFICATION</h2>
      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">
        Dispatch Ref: <strong style="color: #38bdf8;">{ref_id}</strong> | 
        Incident: <strong style="color: #ffffff;">{inc_id}</strong> | 
        Priority: <strong style="color: #fb7185;">{hazard.get("priority", "P0")}</strong>
      </p>
    </div>
    
    <div style="margin-bottom: 16px;">
      <h3 style="color: #ffffff; font-size: 14px; margin-bottom: 8px;">Threat Profile & Telemetry</h3>
      <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
        <tr><td style="color: #94a3b8; padding: 4px 0;">Hazard Category:</td><td style="color: #ffffff; font-weight: bold;">{hazard.get("type")}</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Severity Level:</td><td style="color: #f43f5e; font-weight: bold;">{hazard.get("severity")}</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Address:</td><td style="color: #ffffff;">{loc.get("address")}</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Coordinates:</td><td><a href="{maps_link}" style="color: #38bdf8; text-decoration: none;">LAT {lat}, LNG {lng} (View on Map)</a></td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Trapped Victims:</td><td style="color: #fbbf24; font-weight: bold;">{victims.get("trapped", 0)} personnel</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Medical Urgency:</td><td style="color: #ffffff;">{victims.get("medical_urgency")}</td></tr>
        <tr><td style="color: #94a3b8; padding: 4px 0;">Assigned Unit:</td><td style="color: #34d399; font-weight: bold;">{responder.get("unit") or "UNASSIGNED"}</td></tr>
      </table>
    </div>

    {f'<div style="background-color: #1e293b; padding: 12px; border-radius: 8px; font-size: 12px; margin-bottom: 16px;"><strong>Operator Tactical Intel:</strong><br>{notes}</div>' if notes != "None" else ""}

    <div style="border-top: 1px solid #1f293d; padding-top: 12px; font-size: 11px; color: #64748b;">
      ResQMap Tactical Command · Outbound Relay to Government Emergency Network
    </div>
  </div>
</body>
</html>"""
        return plain_text, html_body

    def _send_sync(self, report: dict) -> dict:
        """Synchronous SMTP delivery executed in background worker thread."""
        if not self._host:
            return {
                "status": EmergencyForwardingStatus.FAILED,
                "http_status_code": None,
                "external_reference_id": None,
                "failure_category": "SMTP_NOT_CONFIGURED",
                "sanitized_error": (
                    "SMTP host not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, "
                    "and SMTP_PASSWORD in backend .env to enable real email dispatch."
                ),
            }

        ref_id = f"SMTP-{uuid.uuid4().hex[:8].upper()}"
        inc_id = report.get("incident_id", "INCIDENT")
        hazard = report.get("hazard", {})
        priority = hazard.get("priority") or hazard.get("severity") or "P0"
        h_type = hazard.get("type") or "Disaster Alert"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{priority} EMERGENCY DISPATCH] {h_type} - {report.get('location', {}).get('address', 'Coordinates Alert')} (Ref: {ref_id})"
        msg["From"] = self._from_email
        msg["To"] = ", ".join(self._recipients)
        msg["X-Priority"] = "1"
        msg["X-ResQMap-Incident-ID"] = str(inc_id)

        plain_body, html_body = self._format_email_body(report, ref_id)
        msg.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if self._use_ssl:
                server = smtplib.SMTP_SSL(self._host, self._port, timeout=self._timeout)
            else:
                server = smtplib.SMTP(self._host, self._port, timeout=self._timeout)

            with server:
                server.ehlo()
                if self._use_tls and not self._use_ssl:
                    server.starttls()
                    server.ehlo()

                if self._username and self._password:
                    server.login(self._username, self._password)

                server.sendmail(self._from_email, self._recipients, msg.as_string())

            logger.info("Emergency report %s dispatched via SMTP to %s (Ref: %s)", inc_id, self._recipients, ref_id)
            return {
                "status": EmergencyForwardingStatus.SENT,
                "http_status_code": 250,
                "external_reference_id": ref_id,
                "failure_category": None,
                "sanitized_error": None,
            }

        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed for user %s on %s", self._username, self._host)
            return {
                "status": EmergencyForwardingStatus.FAILED,
                "http_status_code": None,
                "external_reference_id": None,
                "failure_category": "AUTHENTICATION_ERROR",
                "sanitized_error": "SMTP authentication failed. Verify SMTP_USERNAME and SMTP_PASSWORD in backend .env.",
            }
        except (socket.gaierror, ConnectionRefusedError, TimeoutError, smtplib.SMTPConnectError) as e:
            logger.warning("SMTP connection error connecting to %s:%s - %s", self._host, self._port, e)
            return {
                "status": EmergencyForwardingStatus.RETRY_REQUIRED,
                "http_status_code": None,
                "external_reference_id": None,
                "failure_category": "CONNECTION_ERROR",
                "sanitized_error": f"Failed to connect to SMTP server '{self._host}:{self._port}'. Verify host and network connection.",
            }
        except smtplib.SMTPRecipientsRefused:
            logger.warning("SMTP server rejected all recipients: %s", self._recipients)
            return {
                "status": EmergencyForwardingStatus.FAILED,
                "http_status_code": None,
                "external_reference_id": None,
                "failure_category": "RECIPIENTS_REFUSED",
                "sanitized_error": "Emergency alert recipients were rejected by the SMTP server.",
            }
        except Exception as exc:
            logger.error("Unexpected error dispatching via SMTP: %s", exc)
            return {
                "status": EmergencyForwardingStatus.FAILED,
                "http_status_code": None,
                "external_reference_id": None,
                "failure_category": "SMTP_ERROR",
                "sanitized_error": f"Outbound dispatch failed: {str(exc).splitlines()[0] if str(exc) else 'SMTP error'}",
            }

    async def send_report(self, report: dict) -> dict:
        return await asyncio.to_thread(self._send_sync, report)


# ─────────────────────────────────────────────────────────────────────────────
# Provider factory & Mode helper
# ─────────────────────────────────────────────────────────────────────────────
def get_provider() -> EmergencyReportProvider:
    """
    Returns the configured SMTP Emergency Report provider based on environment variables.
    """
    host = os.environ.get("SMTP_HOST", "").strip()
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        port = 587
    username = os.environ.get("SMTP_USERNAME", "").strip() or None
    password = os.environ.get("SMTP_PASSWORD", "").strip() or None
    from_email = os.environ.get("SMTP_FROM", "").strip() or None
    recipients_raw = os.environ.get("EMERGENCY_ALERT_RECIPIENTS", "").strip()
    recipients = [r.strip() for r in recipients_raw.split(",") if r.strip()] or [
        "ndma.alerts@gov.in", "seoc.controlroom@gov.in", "rescue-dispatch@112.gov.in"
    ]
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
    use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() in ("1", "true", "yes")
    try:
        timeout = float(os.environ.get("SMTP_TIMEOUT_SECONDS", "10"))
    except ValueError:
        timeout = 10.0
    label = os.environ.get("EMERGENCY_REPORT_DESTINATION_LABEL", "").strip() or "National Emergency Dispatch Mesh (NDMA / SEOC / 112)"

    return SmtpEmergencyReportProvider(
        host=host,
        port=port,
        username=username,
        password=password,
        from_email=from_email,
        recipients=recipients,
        use_tls=use_tls,
        use_ssl=use_ssl,
        timeout=timeout,
        label=label,
    )


def get_endpoint_mode() -> str:
    """
    Returns the dispatch transport mode for the frontend.
    """
    host = os.environ.get("SMTP_HOST", "").strip()
    if host:
        return "SMTP_CONFIGURED"
    return "SMTP_OUTBOUND"


# ─────────────────────────────────────────────────────────────────────────────
# Main orchestrator — called by the FastAPI route
# ─────────────────────────────────────────────────────────────────────────────
async def forward_incident(
    incident: dict,
    operator_notes: Optional[str] = None,
    is_retry: bool = False,
) -> EmergencyForwardingAttempt:
    """
    Full forwarding flow:
      1. Build structured report from incident
      2. Validate required fields
      3. Deliver via configured outbound SMTP transport
      4. Store and return the attempt record
    """
    report_id = str(uuid.uuid4())
    incident_id = incident.get("id", "UNKNOWN")
    attempted_at = datetime.now(timezone.utc).isoformat()

    provider = get_provider()

    # Validation
    report = build_emergency_report(incident, operator_notes=operator_notes)
    errors = validate_report(report)
    if errors:
        attempt = EmergencyForwardingAttempt(
            attempt_id=str(uuid.uuid4()),
            incident_id=incident_id,
            destination_label=provider.destination_label,
            attempted_at=attempted_at,
            status=EmergencyForwardingStatus.FAILED,
            http_status_code=None,
            external_reference_id=None,
            failure_category="VALIDATION_ERROR",
            sanitized_error="Report validation failed: " + "; ".join(errors),
            report_id=report_id,
        )
        _store_attempt(attempt)
        return attempt

    # Send
    result = await provider.send_report(report)

    attempt = EmergencyForwardingAttempt(
        attempt_id=str(uuid.uuid4()),
        incident_id=incident_id,
        destination_label=provider.destination_label,
        attempted_at=attempted_at,
        status=result["status"],
        http_status_code=result.get("http_status_code"),
        external_reference_id=result.get("external_reference_id"),
        failure_category=result.get("failure_category"),
        sanitized_error=result.get("sanitized_error"),
        report_id=report_id,
    )
    _store_attempt(attempt)
    return attempt

