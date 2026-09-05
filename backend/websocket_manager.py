"""
ResQMap AI — WebSocket Connection Manager
Broadcasts typed events to all connected clients.
"""
import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("resqmap.ws")


class ConnectionManager:
    """Maintains a set of active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"[WS] Client connected. Total: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        try:
            self.active.remove(ws)
        except ValueError:
            pass
        logger.info(f"[WS] Client disconnected. Total: {len(self.active)}")

    async def broadcast(self, event_type: str, data: dict[str, Any]):
        """Send a typed JSON event to all connected clients."""
        payload = json.dumps({"type": event_type, **data})
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_to(self, ws: WebSocket, event_type: str, data: dict[str, Any]):
        """Send a typed JSON event to a single client."""
        try:
            await ws.send_text(json.dumps({"type": event_type, **data}))
        except Exception:
            self.disconnect(ws)


# Singleton shared across the application
manager = ConnectionManager()


# ─── Event type constants ─────────────────────────────────────────────────────
class WSEvent:
    # Incidents
    INCIDENT_CREATED         = "INCIDENT_CREATED"
    INCIDENT_UPDATED         = "INCIDENT_UPDATED"
    INCIDENT_STATUS_CHANGED  = "INCIDENT_STATUS_CHANGED"

    # SOS
    SOS_CREATED              = "SOS_CREATED"
    SOS_PRIORITY_CHANGED     = "SOS_PRIORITY_CHANGED"
    SOS_STATUS_CHANGED       = "SOS_STATUS_CHANGED"

    # Responders
    RESPONDER_UPDATED        = "RESPONDER_UPDATED"
    RESPONDER_DISPATCHED     = "RESPONDER_DISPATCHED"
    RESPONDER_LOCATION       = "RESPONDER_LOCATION_UPDATED"

    # Live feed
    FEED_STARTED             = "FEED_STARTED"
    FEED_STOPPED             = "FEED_STOPPED"
    FEED_STATUS_CHANGED      = "FEED_STATUS_CHANGED"

    # System
    HEALTH                   = "HEALTH"
