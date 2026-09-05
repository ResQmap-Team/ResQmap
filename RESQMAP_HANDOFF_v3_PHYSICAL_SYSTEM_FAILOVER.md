# RESQMAP AI — MASTER ANTIGRAVITY HANDOFF / CONTINUATION NOTES

> READ THIS FILE COMPLETELY BEFORE MODIFYING THE PROJECT.
>
> This is a handoff for a NEW Antigravity account. The old Antigravity agent ran out of tokens before finishing the project. Continue from the EXISTING CODEBASE. Do NOT rebuild the project from scratch.

---

# 0. CURRENT PROJECT LOCATION

The project is being moved from the old Antigravity scratch directory to:

```text
C:\Users\ivibh\OneDrive\Desktop\Hackatroics\resqmap
```

Expected parent folder:

```text
C:\Users\ivibh\OneDrive\Desktop\Hackatroics
```

The `resqmap` directory is the actual project root.

IMPORTANT:
- Do not assume the old path `C:\Users\ivibh\.gemini\antigravity\scratch\resqmap` still exists.
- Do not hard-code the old path anywhere.
- Prefer relative paths and environment variables.
- The project must work when copied to another teammate's Windows machine.

---

# 1. HACKATHON PROBLEM

## Citizen-Reported Disaster Damage Mapping

Take geotagged photographs of disaster hazards submitted by the public, classify each by hazard type and estimated severity, and plot them on a live response map.

Input images are ground-level photographs taken by untrained people under stress:
- poor lighting
- blur
- tilted angles
- rain
- difficult visibility
- unexpected viewpoints

Hackathon requirements:

1. Trained/image-based classifier with at least 3 distinct hazard categories.
2. Working citizen photo + GPS capture flow.
3. Live map dashboard plotting classified geotagged reports.
4. At least 5 images chosen LIVE by judges, not the team's demo images.
5. Team must explain the visual features that drove each classification.

---

# 2. RESQMAP AI PROJECT GOAL

The project has evolved into:

**ResQMap AI — Citizen Disaster Reporting, AI Verification, SOS Triage, Live Response Mapping & First Responder Coordination**

The complete system should:

```text
Citizen / Victim Phone
        |
        | Photo + GPS + SOS + victim information
        v
ResQMap Backend Cluster
        |
        +--> Gemini Multimodal AI
        |       |
        |       +--> Hazard classification
        |       +--> Severity
        |       +--> Authenticity / false alarm
        |       +--> Visual evidence
        |
        +--> Incident Database
        |
        +--> SOS Priority Engine
        |
        +--> First Responder Database
        |
        +--> GPS Telemetry
        |
        +--> Route / Mission Tracking
        |
        +--> WebSocket live events
        |
        +--> Live-feed session management
        |
        v
Command Center / First Responders
        |
        +--> Live disaster map
        +--> Priority queue
        +--> Responder assignment
        +--> Responder GPS
        +--> Live camera feeds
        +--> Mission status
```

---

# 3. TEAM WORK DIVISION

There are 3 members in the team.

## Current project / this workstream

The current owner is implementing:

1. SOS Priority
2. Volunteer System Analysis
3. Live Feed WiFi / Internet Connectivity
4. Core backend integration required by those systems
5. GPS optimization required by those systems
6. Multi-device / multi-server operation

## Other team members will implement

### Team Member feature group A
- Emergency Contact Links
- Forwarding emergency/disaster requests to government/authority systems in the correct format

### Team Member feature group B
- Nearest SafeHouse / Safe Areas Near Me
- Value Added Systems for Volunteers

These features will be merged during final integration.

DO NOT permanently hard-code or tightly couple the architecture to those unfinished features.

Create clean API boundaries so they can be added later.

---

# 4. CURRENT ACTUAL CODEBASE STATE

The supplied project snapshot contains a substantially developed React frontend.

It does NOT contain the full backend described in the earlier implementation plan.

Currently present backend files:

```text
backend/models.py
backend/requirements.txt
```

Currently missing from the supplied snapshot:

```text
backend/main.py
backend/ai_engine.py
backend/database.py
```

Therefore:

**THE BACKEND IS THE MAJOR UNFINISHED COMPONENT.**

Do not assume the backend already exists.

---

# 5. EXISTING FRONTEND

Current frontend stack:

```text
React 18
Vite
Tailwind CSS
Leaflet
React Leaflet
Lucide React
Google @google/genai
exifr
PeerJS
```

Important frontend files:

```text
frontend/src/App.jsx

frontend/src/components/
    AllReportsView.jsx
    AnalyticsView.jsx
    CitizenReportModal.jsx
    IncidentDrawer.jsx
    JudgeSandbox.jsx
    LiveMap.jsx
    Navbar.jsx
    ResilienceModal.jsx
    ResponderHub.jsx
    SettingsModal.jsx
    StatsBar.jsx

frontend/src/context/
    DisasterContext.jsx

frontend/src/data/
    seedIncidents.js

frontend/src/services/
    corroborationService.js
    exifService.js
    geminiClassifier.js
    liveStreamService.js
```

Preserve these components unless there is a concrete bug requiring modification.

---

# 6. EXISTING AI CLASSIFICATION

File:

```text
frontend/src/services/geminiClassifier.js
```

Current frontend attempts multimodal Gemini classification using:

```text
@google/genai
```

The code currently requests:

```text
gemini-3.7-flash
```

IMPORTANT:
Before changing the model identifier, verify the currently supported Gemini model/API. Do not blindly assume the old model name is still valid.

The intended result contains:

```text
hazardCategory
severity
confidence
isRealDisaster
authenticityScore
falseAlarmReason
visualFeatures
recommendedUnits
damageAssessment
safetyInstructions
```

Six intended hazard categories:

```text
Flood / Waterlogging
Structural Damage / Building Collapse
Fire / Wildfire / Smoke
Landslide / Mudslide
Downed Powerlines / Electrical Hazard
Road Obstruction / Debris
```

Severity:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

The existing frontend also contains a client-side heuristic fallback classifier.

DO NOT remove the fallback.

It is useful for:
- no API key
- temporary Gemini outage
- offline/local judging
- development

---

# 7. FALSE-ALARM / AUTHENTICITY REQUIREMENT

Every citizen/judge image should ideally produce:

```text
Real Disaster: YES/NO
Authenticity: 0-100
Reason
Visual evidence
```

Examples that should be rejected/flagged:
- coffee cup
- normal office
- selfie
- ordinary road
- unrelated image
- prank
- obvious non-emergency
- stock/non-contextual image when detectable

IMPORTANT:
AI must NOT blindly declare an image genuine just because it resembles a disaster.

Use confidence thresholds and an explicit verification state.

Recommended conceptual states:

```text
AI_PENDING
AI_VERIFIED_REAL
AI_SUSPECTED_FALSE
MANUAL_REVIEW
```

Do not claim physical-world truth from an image alone. The system should call it an AI authenticity/triage assessment and allow responder confirmation.

---

# 8. CURRENT LOCALHOST PROBLEM

A phone currently opens:

```text
http://localhost:5173
```

and gets:

```text
ERR_CONNECTION_REFUSED
```

This is EXPECTED when the phone is not running the Vite server itself.

CRITICAL CONCEPT:

```text
localhost = THIS DEVICE
```

On the development PC:

```text
localhost:5173
```

means the PC.

On a phone:

```text
localhost:5173
```

means the PHONE.

Therefore, the phone cannot access the PC's localhost address.

---

# 9. LAN ACCESS REQUIREMENT

The application MUST work from other devices on the same WiFi/LAN.

The current Vite configuration already contains:

```js
server: {
  port: 5173,
  host: true
}
```

This is good and should be preserved.

However, the user must access the PC using its LAN IP, for example:

```text
http://192.168.1.10:5173
```

NOT:

```text
http://localhost:5173
```

The backend must similarly bind to:

```text
0.0.0.0
```

rather than only:

```text
127.0.0.1
```

Example:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

The implementation must document:
- how to find Windows LAN IP
- Windows Firewall rules
- which ports are required
- how phones access the app
- how phones access the backend

---

# 10. INTERNET ACCESS REQUIREMENT

The system must not assume all devices are on the same WiFi.

Target modes:

### Mode A — Same WiFi / LAN

```text
Phone
   |
 WiFi
   |
PC running Vite + backend
```

Access via:

```text
http://PC_LAN_IP:5173
```

### Mode B — Internet

```text
Phone A
     \
      Internet
       |
Backend/API
       |
Phone B / Responder / Command Center
```

For actual internet deployment, use:
- HTTPS
- public backend endpoint
- secure WebSocket/WSS
- WebRTC STUN
- TURN fallback for restrictive NAT/firewalls

Do NOT assume WebRTC will always connect using STUN alone.

---

# 11. MULTI-SYSTEM / PHYSICAL SERVER FAILOVER REQUIREMENT

THIS IS A CORE REQUIREMENT.

## IMPORTANT TERMINOLOGY

When the team says **"system"**, **"physical system"**, or **"server system"**, it means an ACTUAL PHYSICAL DEVICE belonging to a teammate:

```text
Teammate A laptop
Teammate B laptop
Teammate C laptop
```

It does NOT mean an abstract API node, software microservice, or logical API instance.

The requirement is:

> If the physical computer currently hosting ResQMap goes down, another teammate's physical computer must be able to take over hosting ResQMap so the rest of the team can continue operating.

Example:

```text
              RESQMAP TEAM NETWORK
                       |
        +--------------+--------------+
        |              |              |
   PHYSICAL PC A   PHYSICAL PC B   PHYSICAL PC C
   Teammate A      Teammate B      Teammate C
        |              |              |
   Can host         Can host       Can host
   ResQMap          ResQMap        ResQMap
```

If PC A is active:

```text
Phones / Responders / Command Center
                |
                v
        PC A — ACTIVE HOST
```

If PC A physically shuts down:

```text
PC A — OFFLINE
          X

PC B — TAKEOVER / ACTIVE HOST
          |
          v
Phones / Responders / Command Center
```

This is a **physical-machine failover requirement**.

## 11A. WHAT "MULTISYSTEM SERVER" MEANS

Multiple physical computers must be capable of running the same ResQMap backend.

Example:

```text
Teammate A PC:
C:\...\Hackatroicsesqmap
    frontend
    backend

Teammate B PC:
C:\...\Hackatroicsesqmap
    frontend
    backend

Teammate C PC:
C:\...\Hackatroicsesqmap
    frontend
    backend
```

These are THREE PHYSICAL SYSTEMS capable of hosting the application.

Do not confuse this with three API processes running on one laptop.

Each teammate should be able to start a ResQMap backend from their own computer.

## 11B. PHYSICAL HOST DISCOVERY / FAILOVER

The application should maintain knowledge of available physical hosts.

Example:

```text
SYSTEM A
Physical machine: Teammate A laptop
IP: 192.168.1.10
STATUS: ONLINE
ROLE: ACTIVE HOST

SYSTEM B
Physical machine: Teammate B laptop
IP: 192.168.1.11
STATUS: ONLINE
ROLE: STANDBY HOST

SYSTEM C
Physical machine: Teammate C laptop
IP: 192.168.1.12
STATUS: ONLINE
ROLE: STANDBY HOST
```

If System A becomes unreachable:

```text
SYSTEM A
192.168.1.10
OFFLINE

SYSTEM B
192.168.1.11
ONLINE
```

the clients should be able to switch to System B.

For the hackathon, a configurable list of actual teammate machine addresses is acceptable.

Do NOT create a fake status indicator. Status must come from real network health checks.

## 11C. PRACTICAL HACKATHON ARCHITECTURE

Do not over-engineer this into cloud-scale infrastructure.

The demonstrable requirement is:

```text
             Shared WiFi / LAN
                    |
       +------------+------------+
       |            |            |
      PC A         PC B         PC C
    PRIMARY      BACKUP       BACKUP
       |            |            |
       +------------+------------+
                    |
             Shared/Persistent DB
```

All three physical systems must have the same application code and be capable of becoming the active host.

For shared state, use a database that can actually be reached by all physical systems, OR a properly deployed shared database service.

DO NOT treat:

```text
PC A -> database_A.sqlite
PC B -> database_B.sqlite
PC C -> database_C.sqlite
```

as one shared database. They are independent databases and will diverge.

Local SQLite can remain available for single-machine/offline development.

## 11D. FRONTEND PHYSICAL-HOST FAILOVER

The frontend should be able to switch between actual teammate computers.

Conceptually:

```text
Physical Host A
       |
   /api/health
       |
       X

Try Physical Host B
       |
   /api/health
       |
       ✓

Use Physical Host B
```

Configuration can contain actual machine URLs such as:

```text
http://192.168.1.10:8000
http://192.168.1.11:8000
http://192.168.1.12:8000
```

The exact IP addresses depend on the team's network.

The frontend should:

1. health-check the active physical host
2. detect when that physical machine/server is unreachable
3. try the next configured physical host
4. switch the active backend
5. reconnect the WebSocket
6. continue reading/writing shared incident data

Do not permanently hard-code one teammate's IP.

## 11E. PHYSICAL SYSTEM FAILOVER TEST

This must be tested using actual computers.

### Test 1 — Primary system

Start ResQMap backend on:

```text
PC A
```

Open the application from:

```text
Phone
PC B
PC C
```

Verify all devices can communicate with PC A.

### Test 2 — Kill the physical host

While the application is operating:

```text
SHUT DOWN PC A
```

or disconnect PC A from the network.

Expected:

```text
PC A -> OFFLINE
PC B -> ACTIVE HOST
```

Clients should reconnect to PC B.

### Test 3 — Verify actual operation after takeover

Submit a new incident from a phone.

Expected:

```text
Phone
  ↓
PC B backend
  ↓
shared database
  ↓
command center receives incident
```

This proves actual physical-system failover rather than a simulated UI.

## 11F. LIVE VIDEO AND PHYSICAL HOST FAILOVER ARE DIFFERENT

The physical host failover requirement applies primarily to:

```text
incident management
SOS
responder data
GPS telemetry
WebSocket coordination
database access
live-feed session metadata
```

Do NOT unnecessarily route the actual responder camera video through every physical backend computer.

For live video:

```text
Responder Phone
       |
       +---- WebRTC media ----> Authorized Viewer

Backend
       |
       +---- manages:
             responder identity
             incident
             feed/session metadata
             authorization
             presence
```

The backend coordinates the feed; WebRTC carries the actual media.

If the active physical backend fails, the signaling/session coordination may need reconnection, but the backend should not be a video proxy unless there is a specific reason.

# 12. MULTI-NODE DATABASE REQUIREMENT

DO NOT use independent SQLite databases on different machines and call that high availability.

Example of what NOT to do:

```text
PC A -> database.sqlite
PC B -> different database.sqlite
```

These databases will diverge.

Preferred architecture:

```text
API Node A ----\
API Node B -----+--> Shared PostgreSQL
API Node C ----/
```

Redis can optionally provide:

```text
Pub/Sub
Live telemetry events
WebSocket event fan-out
```

For a hackathon fallback, local SQLite may remain available in single-node development mode.

But production/demo HA mode must use a shared database.

---

# 13. BACKEND RESPONSIBILITIES

Create:

```text
backend/main.py
backend/ai_engine.py
backend/database.py
```

Additional modules may be created if they make the architecture cleaner:

```text
backend/
    main.py
    models.py
    database.py
    ai_engine.py
    priority_engine.py
    responder_service.py
    telemetry_service.py
    websocket_manager.py
    config.py
```

Do not create unnecessary complexity.

---

# 14. REQUIRED BACKEND API

Exact endpoints must be reconciled with the existing frontend, but the backend should support at minimum:

```text
GET  /api/health

GET  /api/incidents

POST /api/incidents

GET  /api/incidents/{incident_id}

POST /api/classify-live

PATCH /api/incidents/{incident_id}/status

PATCH /api/incidents/{incident_id}/dispatch

GET  /api/responders

POST /api/responders

PATCH /api/responders/{responder_id}/location

GET  /api/responders/{responder_id}/missions

POST /api/sos

GET  /api/sos/queue

GET  /api/routes

POST /api/routes

WS   /ws
```

Add appropriate endpoints for:
- live feed sessions
- telemetry
- responder mission history
- SOS queue

Keep API schemas consistent with `backend/models.py`.

---

# 15. IMPORTANT EXISTING BACKEND MODELS

File:

```text
backend/models.py
```

Existing enums include:

```text
HazardCategory
SeverityLevel
IncidentStatus
```

Incident status:

```text
PENDING
VERIFIED
DISPATCHED
EN_ROUTE
ON_SCENE
RESOLVED
FLAGGED_FALSE_ALARM
```

Existing models include:

```text
AIAnalysisResult
IncidentCreate
Incident
DispatchUpdate
LiveClassificationRequest
APIKeyConfig
```

Use these rather than creating incompatible duplicate versions.

---

# 16. SOS PRIORITY SYSTEM — REQUIRED

This is one of the features currently assigned to this workstream.

Scenario:

A major disaster occurs, e.g.:

```text
earthquake
landslide
flood
building collapse
```

Victims open the app and press:

```text
SOS
```

The backend receives:

```text
victim GPS
timestamp
incident/disaster ID if known
victim information
medical urgency
trapped status
number of victims
elderly/infant status
```

The system must prioritize victims.

IMPORTANT:
Do NOT simply rank victims by distance alone.

A better triage score should consider:

```text
distance from hazard / epicenter
+
medical urgency
+
trapped status
+
number of victims
+
elderly/infant vulnerability
+
hazard severity
+
time waiting
+
responder accessibility
```

Distance should be a major component, especially for proximity to an earthquake/landslide/flood incident.

Example conceptual scoring:

```text
P0 = Immediate life threat
P1 = Very high risk
P2 = High but stable
P3 = Lower urgency
```

The exact weights should be configurable.

The UI should explain WHY someone has a priority rank.

Example:

```text
SOS #17
Priority: P0 CRITICAL

Reasons:
- 0.8 km from hazard epicenter
- 2 trapped victims
- Medical emergency reported
- Waiting 7 minutes
```

Do not expose a misleading claim such as "this person will definitely die first."

Call it:

```text
AI-assisted emergency triage priority
```

and allow human dispatcher override.

---

# 17. SOS QUEUE

Command Center should have:

```text
SOS PRIORITY QUEUE
```

Sorted by priority and then urgency.

Example:

```text
P0  Victim 17   0.8 km   2 trapped   MEDICAL
P0  Victim 21   1.2 km   unconscious
P1  Victim 08   1.7 km   elderly
P1  Victim 31   2.1 km   4 victims
P2  Victim 04   3.8 km
```

New SOS requests should appear live through WebSocket.

---

# 18. FIRST RESPONDER ROUTE DATABASE

The system must maintain a database of responder missions.

Every dispatched responder should have:

```text
responder ID
responder name
unit
vehicle
incident ID
assignment time
dispatch status
current GPS
destination GPS
ETA
route
arrival time
completion time
notes
```

Mission states:

```text
ASSIGNED
DISPATCHED
EN_ROUTE
ON_SCENE
RESOLVED
CANCELLED
```

Example:

```text
Unit: Alpha Swiftwater
Responder: FR-017
Task: Flood rescue
Incident: INC-2026-0017
Status: EN_ROUTE
Distance: 1.4 km
ETA: 4 min
```

The database must preserve historical missions.

This is NOT just UI state.

---

# 19. RESPONDER GPS TELEMETRY

The system must map first responder movement using GPS.

When a responder is using the responder interface:

```text
navigator.geolocation.watchPosition(...)
```

should periodically send telemetry to the backend.

Data:

```text
responder_id
latitude
longitude
accuracy
heading
speed
timestamp
incident_id
```

The backend stores recent telemetry and optionally a route history.

The command center should see:

```text
Responder marker moving on map
```

in near-real-time.

Use throttling/batching so the phone does not send excessive requests.

Recommended development target:

```text
1 GPS update every 2–5 seconds while EN_ROUTE
```

with adaptive throttling based on movement.

Do NOT update every few milliseconds.

---

# 20. GPS OPTIMIZATION — CURRENT PROBLEM

The existing application does not implement GPS robustly enough.

Current EXIF helper:

```text
frontend/src/services/exifService.js
```

can extract GPS if the photograph actually contains EXIF GPS metadata.

IMPORTANT:
Many phone photos do NOT contain accessible GPS EXIF data after:
- WhatsApp transfer
- screenshot
- compression
- social media upload
- editing
- privacy settings

Therefore the app MUST use a fallback chain:

```text
1. EXIF GPS
       ↓ if missing
2. navigator.geolocation
       ↓ if unavailable/denied
3. manual map pin
       ↓
4. optional typed coordinates
```

Never assume EXIF exists.

---

# 21. GPS QUALITY DISPLAY

The application should record:

```text
GPS source:
EXIF
LIVE_DEVICE
MANUAL
UNKNOWN
```

and:

```text
accuracy in meters
```

Example:

```text
Location:
13.0827, 80.2707

Source: LIVE_DEVICE
Accuracy: ±8m
```

If EXIF and live GPS disagree significantly, show a warning and allow the user to choose.

Do NOT silently overwrite a good GPS coordinate.

---

# 22. GPS DISTANCE CALCULATION

Use proper geodesic/Haversine calculations for:

```text
victim -> disaster
responder -> incident
responder -> victim
```

Do not use simple latitude/longitude subtraction.

Distance should be represented in:

```text
meters
or
kilometers
```

depending on scale.

---

# 23. LIVE FEED — CORE REQUIREMENT

Only:

```text
VOLUNTEERS / PROFESSIONAL FIRST RESPONDERS
```

should have access to broadcasting their camera.

Normal citizens should NOT have a responder broadcast button.

Commanders / authorized responders can watch.

---

# 24. CURRENT LIVE CAMERA BUG

Existing file:

```text
frontend/src/components/ResponderHub.jsx
```

Existing broadcast logic calls:

```js
navigator.mediaDevices.getUserMedia({
    video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
    },
    audio: true
});
```

Then:

```js
setCameraStream(stream);

if (localVideoRef.current) {
    localVideoRef.current.srcObject = stream;
}
```

There is an existing `localVideoRef`.

The user reports:

> "my camera is not utilizing / I can't see me"

This must be debugged.

---

# 25. LIVE CAMERA DEBUG CHECKLIST

Inspect the actual `<video>` element and make sure it has:

```html
<video
    ref={localVideoRef}
    autoPlay
    muted
    playsInline
/>
```

After assigning:

```js
video.srcObject = stream;
```

ensure:

```js
video.play()
```

is handled appropriately.

Important mobile requirements:

```text
autoPlay
muted
playsInline
```

The browser may block playback without these.

Also check:

```text
navigator.mediaDevices
navigator.mediaDevices.getUserMedia
HTTPS / secure context
camera permission
microphone permission
Android browser permission
```

### VERY IMPORTANT

On a phone:

```text
http://192.168.x.x:5173
```

is NOT necessarily a secure context for camera APIs.

Some browser camera APIs require:

```text
HTTPS
```

or:

```text
localhost
```

for secure-context access.

Therefore LAN mobile camera testing may require an HTTPS development setup.

Possible solutions:
- local HTTPS certificate
- trusted development certificate
- secure tunnel
- deployed HTTPS frontend

Do not falsely claim camera support if browser security prevents it.

---

# 26. FRONT CAMERA / REAR CAMERA

Responder broadcast should default to:

```text
facingMode: environment
```

because a bodycam-style responder feed normally uses the rear camera.

Provide a camera switch:

```text
Rear Camera
Front Camera
```

using:

```text
facingMode: environment
facingMode: user
```

If a device has multiple cameras, enumerate devices only after permission is granted.

---

# 27. LIVE FEED MUST BE VISIBLE TO OTHER RESPONDERS

Requirement:

Responder A opens live camera.

Responder B / Commander opens Live Feed.

Responder B must be able to see A's camera over the network/internet.

Architecture:

```text
Responder A
   |
Camera
   |
getUserMedia
   |
WebRTC
   |
Internet / LAN
   |
Responder B / Commander
```

WebRTC should carry the actual media.

The backend should manage:
- authorization
- feed metadata
- incident association
- responder identity
- stream/session state
- viewer presence
- WebSocket notifications

---

# 28. CURRENT PEERJS IMPLEMENTATION

Existing file:

```text
frontend/src/services/liveStreamService.js
```

uses:

```text
PeerJS
```

and a public PeerJS signaling service.

It creates deterministic room IDs from incident IDs.

It uses STUN servers including:

```text
stun:stun.l.google.com:19302
stun:global.stun.twilio.com:3478
```

This is a useful prototype but is NOT sufficient as the final robust architecture.

Problems to investigate:

1. deterministic PeerJS IDs can collide
2. public signaling dependency
3. NAT/firewall failures
4. no TURN server
5. weak authentication/authorization
6. stream metadata is not persisted centrally
7. no proper multi-feed registry
8. no robust reconnect/failover
9. room identity tied too closely to incident ID

DO NOT remove working PeerJS functionality before replacing it with a tested alternative.

---

# 29. MULTIPLE LIVE FEEDS

The system must support:

```text
Responder A -> Incident 001 -> live feed
Responder B -> Incident 001 -> live feed
Responder C -> Incident 002 -> live feed
```

Command center should see a feed list:

```text
LIVE RESPONDER FEEDS

● Alpha Swiftwater — INC-001 — LIVE
● USAR Team 4 — INC-001 — LIVE
● Medical Unit 8 — INC-002 — LIVE
```

Selecting a feed opens that stream.

Do not design the system around only one global live feed.

---

# 30. LIVE FEED METADATA

Each live feed should have:

```text
feed_id
responder_id
incident_id
started_at
last_seen
status
viewer_count
latitude
longitude
heading
speed
```

Status:

```text
STARTING
LIVE
RECONNECTING
OFFLINE
ENDED
```

---

# 31. LIVE FEED AUTHORIZATION

Broadcasting is restricted to:

```text
VOLUNTEER
PROFESSIONAL_RESPONDER
COMMANDER
```

Citizens:

```text
CITIZEN
```

cannot start responder live feeds.

For the hackathon, a simple demo role selector/authentication may be acceptable.

But enforce the role in backend APIs too.

Do NOT rely only on hiding a frontend button.

---

# 32. WIFI LIVE FEED MODE

"Live Feed WiFi Connect" means the system should work when responders and command devices are connected to the same WiFi.

The app should:

1. detect/use the backend LAN address
2. connect to the backend via LAN
3. use WebRTC over LAN when possible
4. fall back to STUN/TURN when internet routing is required
5. reconnect when network changes

The UI should show:

```text
NETWORK: LAN / INTERNET
SIGNAL: GOOD / FAIR / POOR
```

Do not implement a fake WiFi indicator.

Use actual connection state where possible.

---

# 33. LIVE FEED INTERNET REQUIREMENT

For internet operation, use:

```text
HTTPS
WSS
STUN
TURN
```

TURN is important because direct peer-to-peer WebRTC does not work for every NAT/firewall configuration.

The implementation should make ICE server configuration environment-based:

```text
VITE_ICE_SERVERS
```

or backend-provided configuration.

Do not hard-code secret TURN credentials in frontend source.

---

# 34. VOLUNTEER SYSTEM ANALYSIS

This is one of the current workstream features.

The system should analyze volunteer/responder availability and operational state.

Possible fields:

```text
volunteer ID
role
skills
certifications
availability
current location
current assignment
current status
distance to incident
estimated arrival
current workload
completed missions
```

Statuses:

```text
AVAILABLE
ASSIGNED
EN_ROUTE
ON_SCENE
OFF_DUTY
UNAVAILABLE
```

The analysis can calculate:

```text
Available responders
Busy responders
Responders nearby
Average response time
Completed missions
Active missions
Unresolved missions
```

---

# 35. VOLUNTEER MATCHING

When an incident requires:

```text
Swiftwater Rescue
USAR
Medical
Fire
Electrical
Road Clearing
```

the backend should rank suitable responders based on:

```text
required skill
+
availability
+
distance
+
current workload
+
incident severity
```

Do not assign an unavailable responder.

Human dispatcher must retain override capability.

---

# 36. FIRST RESPONDER ROUTE HISTORY

Every mission must retain historical information.

Example:

```text
Mission #1047

Responder: FR-017
Incident: INC-0098
Assigned: 20:04
Dispatched: 20:05
En Route: 20:06
On Scene: 20:13
Resolved: 20:41

Distance travelled: 6.4 km
Response time: 8 min
Mission duration: 36 min
```

This enables the Volunteer System Analysis dashboard.

---

# 37. LIVE RESPONDER MAP

The command map should show:

```text
Incident marker
Victim SOS markers
Responder markers
Responder movement trails
```

Responder marker can display:

```text
Unit name
status
speed
heading
ETA
assigned incident
```

Clicking responder opens details.

---

# 38. ROUTE DATABASE VS NAVIGATION

The database should store mission/route history.

It does NOT need to implement a full Google Maps replacement.

For routing:
- browser/OS navigation can be used
- OSRM / OpenRouteService / another routing service may be used
- route calculation should be abstracted

Store the resulting route/telemetry history.

---

# 39. EMERGENCY CONTACT LINKS — FUTURE TEAM FEATURE

Another team member will build this.

The architecture should provide a clean integration endpoint such as:

```text
POST /api/emergency/forward
```

Input:

```text
incident
location
hazard
severity
victim details
AI verification
images
responder status
```

The module should later format the request for the relevant authority.

Do not implement a fake government API.

If no official API exists, support:
- generated official-format report
- secure link
- email/SMS/share workflow
- downloadable incident report

---

# 40. SAFEHOUSE / SAFE AREA — FUTURE TEAM FEATURE

Another team member will build:

```text
Nearest SafeHouse / Safe Areas Near Me
```

Provide future API boundary:

```text
GET /api/safe-areas/nearby?lat=...&lon=...
```

The future module can return:

```text
name
type
latitude
longitude
capacity
distance
availability
```

Do not couple the SOS engine directly to the unfinished implementation.

---

# 41. FRONTEND BACKEND INTEGRATION — CURRENT PROBLEM

The existing `DisasterContext.jsx` contains:

```text
backendUrl
updateBackendUrl
```

and localStorage key:

```text
RESQMAP_BACKEND_URL
```

Default:

```text
http://localhost:8000
```

BUT the current snapshot does not actually use this backend URL throughout the application.

This is a major integration gap.

Search the entire frontend before modifying.

The backend URL should become the actual source for:

```text
incidents
classification where server-side
SOS
dispatch
responder telemetry
live feed metadata
WebSocket
```

---

# 42. API CLIENT

Create a central API service, for example:

```text
frontend/src/services/api.js
```

It should handle:

```text
GET/POST/PATCH
timeouts
JSON parsing
errors
authentication if added
backend failover
```

Do not scatter raw `fetch()` calls everywhere.

---

# 43. MULTI-BACKEND FAILOVER

Frontend configuration should support something like:

```text
API Node 01
API Node 02
API Node 03
```

Health check:

```text
/api/health
```

If Node 01 fails:

```text
Node 01
  X

Node 02
  ✓

Use Node 02
```

WebSocket must reconnect to the healthy backend.

Do not require the user to manually change the backend URL every time a server fails.

---

# 44. IMPORTANT: DATA CONSISTENCY

If the frontend uses localStorage as the primary source while other devices use the backend, devices will not automatically share incidents.

Current localStorage key:

```text
RESQMAP_INCIDENTS_V3
```

Keep it as an offline/demo cache.

But in network mode:

```text
Backend = source of truth
localStorage = cache/fallback
```

This distinction is essential.

---

# 45. REAL-TIME EVENTS

Use WebSockets for:

```text
new incident
incident classification completed
incident status changed
SOS created
SOS priority changed
responder dispatched
responder GPS changed
live feed started
live feed stopped
viewer joined
```

Example:

```json
{
  "type": "RESPONDER_LOCATION_UPDATED",
  "responder_id": "FR-017",
  "incident_id": "INC-1001",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "timestamp": "..."
}
```

---

# 46. INCIDENT DATABASE

Backend database should preserve:

```text
incident
classification
authenticity
victim information
location
timestamps
dispatch
responder assignment
status history
```

Do not overwrite historical status information.

Create a status/event history table or equivalent.

---

# 47. SECURITY

Minimum requirements:

1. Never commit Gemini API keys.
2. Do not store secrets in frontend source.
3. Backend Gemini key should be environment-based.
4. Validate image size/type.
5. Validate coordinates.
6. Rate-limit expensive AI classification where practical.
7. Validate responder role before live feed access.
8. Do not expose unrestricted database APIs.
9. Use HTTPS/WSS for internet deployment.
10. Do not trust client-supplied priority values without server validation.

---

# 48. GEMINI COST CONTROL

The system must be cost-effective.

Do not call Gemini unnecessarily.

Recommended flow:

```text
Image received
    |
Basic validation
    |
Is this obviously invalid?
    |
    +--> yes -> reject locally
    |
    +--> no
          |
       Gemini
```

Avoid repeated classification of the exact same image.

Use a hash/cache:

```text
SHA-256(image)
```

If the same image is submitted again:

```text
return cached classification
```

Judge Sandbox should avoid accidentally sending duplicate requests repeatedly.

Keep fallback mode available.

---

# 49. ANDROID SUPPORT

The application must work on Android devices.

Priority:

### Phase 1 — Mobile Web / PWA

Make the React application:
- responsive
- touch friendly
- camera compatible
- GPS compatible
- installable as a PWA where possible

Use:

```html
<input type="file"
       accept="image/*"
       capture="environment">
```

for citizen camera capture where appropriate.

### Phase 2 — Android wrapper if required

If an actual APK is needed, use a technology such as:

```text
Capacitor
```

to package the React/Vite application.

Do not rewrite the application as a separate Android project unless necessary.

---

# 50. ANDROID CAMERA

For Android:
- request camera permission through browser/app
- use rear camera for disaster capture by default
- use front/rear switching for responders
- ensure `playsInline`
- ensure video playback
- handle permission denial gracefully

Test on:
- Android Chrome
- actual phone, not only desktop emulation

---

# 51. ANDROID GPS

Use:

```js
navigator.geolocation.getCurrentPosition(...)
navigator.geolocation.watchPosition(...)
```

with:

```text
enableHighAccuracy: true
timeout
maximumAge
```

Do not request high-accuracy GPS continuously when not needed.

Citizen report:
- one good position fix is usually enough

Responder EN_ROUTE:
- periodic watch updates

---

# 52. PWA OFFLINE SUPPORT

If feasible, add:
- service worker
- cached shell
- offline incident draft
- retry queue

If network is unavailable:

```text
SAVE REPORT LOCALLY
        |
Network restored
        |
SYNC WITH BACKEND
```

Do not silently lose an SOS/report.

For a real SOS, show clear delivery state:

```text
SOS SENT
or
SOS QUEUED — NETWORK UNAVAILABLE
```

Never falsely display "sent" if the backend did not receive it.

---

# 53. LIVE MAP

Existing file:

```text
frontend/src/components/LiveMap.jsx
```

Preserve:
- Leaflet
- severity markers
- filters
- incident drawer
- map layers

Add:
- live SOS markers
- live responder markers
- responder movement trails
- priority visualization
- real backend WebSocket updates

---

# 54. JUDGE SANDBOX

Existing:

```text
frontend/src/components/JudgeSandbox.jsx
```

DO NOT REMOVE.

It is critical to the hackathon judging criterion.

The judge should be able to:

```text
Upload arbitrary image
      ↓
Classify
      ↓
Hazard
Severity
Confidence
Visual evidence
Authenticity
      ↓
Send to map
```

Must work on at least 5 live judge-selected images.

Do not depend exclusively on pre-seeded demo images.

---

# 55. CITIZEN REPORT FLOW

Existing:

```text
CitizenReportModal.jsx
```

Preserve:
- image capture/upload
- EXIF
- browser GPS
- manual map pin
- victim questionnaire
- AI preview
- safety instructions

Integrate it with the backend.

---

# 56. EXISTING SEED INCIDENTS

File:

```text
frontend/src/data/seedIncidents.js
```

These are Chennai / VIT-oriented demo incidents.

Keep them.

Use them when:

```text
offline
backend unavailable
demo mode
```

But when connected to the real backend:

```text
backend incidents should become authoritative
```

---

# 57. EXISTING CORROBORATION ENGINE

File:

```text
frontend/src/services/corroborationService.js
```

There is already spatial/temporal corroboration logic.

Preserve and consider moving the authoritative version to the backend.

The concept:

```text
Citizen report A
+
Citizen report B
nearby in space/time
=
Corroborated incident
```

This is useful for:
- false-alarm reduction
- incident confidence
- multi-citizen confirmation

---

# 58. FIRST RESPONDER STATUS

Existing UI already supports mission lifecycle.

Preserve:

```text
PENDING
VERIFIED
DISPATCHED
EN_ROUTE
ON_SCENE
RESOLVED
FLAGGED_FALSE_ALARM
```

Backend should persist these changes.

---

# 59. DISPATCH

Dispatch operation should record:

```text
incident_id
responder_id / unit_id
assigned_by
assigned_at
status
ETA
current distance
notes
```

Do not simply mutate a frontend object.

---

# 60. TESTING REQUIREMENT

Create/update backend tests.

Minimum:

```text
GET /api/health
GET /api/incidents
POST /api/incidents
POST /api/classify-live
POST /api/sos
GET /api/sos/queue
PATCH responder location
PATCH incident status
dispatch
WebSocket connection
```

Also test:

```text
Gemini unavailable
Gemini invalid response
no API key
bad image
non-image upload
missing GPS
manual GPS
SOS priority
responder GPS
server node failure
```

---

# 61. MULTI-DEVICE TEST

This is REQUIRED.

Test:

```text
Laptop A
    |
    +--> Backend Node 01
    +--> Vite frontend

Phone A
    |
    +--> same network
    +--> citizen report

Phone B
    |
    +--> responder mode
    +--> GPS telemetry
    +--> camera

Laptop B
    |
    +--> command center
    +--> watches responder
```

Verify:

```text
Phone A report
    ↓
Laptop B map updates
```

and:

```text
Phone B camera
    ↓
Laptop B sees live feed
```

and:

```text
Phone B GPS
    ↓
Laptop B sees responder movement
```

---

# 62. MULTI-PHYSICAL-SYSTEM FAILOVER TEST

Example:

```text
Physical System A = teammate A laptop
Physical System B = teammate B laptop
Physical System C = teammate C laptop
```

Start the ResQMap backend on System A and keep B/C ready to host it.

Connect clients.

Then physically shut down System A or disconnect it from the network.

Expected:

```text
System A -> OFFLINE
System B -> ACTIVE HOST
Frontend -> automatically reconnects
```

No fake status change is acceptable.

Incident data must remain available through the shared/persistent database.

The purpose of this test is to prove that **another teammate's actual physical computer can take over when the current host computer goes down**.

# 63. IMPORTANT DEVELOPMENT ORDER

Do NOT attempt everything at once.

Work in this order:

## Phase 1
Inspect complete codebase.

## Phase 2
Fix mobile/LAN access.

## Phase 3
Create backend API.

## Phase 4
Connect incidents/frontend to backend.

## Phase 5
Implement real SOS priority engine.

## Phase 6
Implement responder database + mission history.

## Phase 7
Implement responder GPS telemetry.

## Phase 8
Fix local camera preview.

## Phase 9
Implement robust live-feed session management.

## Phase 10
Add multi-feed viewing.

## Phase 11
Add backend failover.

## Phase 12
Test Android.

## Phase 13
Integrate teammates' modules.

---

# 64. DO NOT DESTROY EXISTING FUNCTIONALITY

Do NOT:
- rebuild the UI
- replace the entire React application
- remove Judge Sandbox
- remove fallback AI
- remove Leaflet
- remove EXIF
- remove existing responder HUD
- remove WebRTC before replacement is tested
- remove seed incidents
- remove localStorage fallback
- hard-code a single teammate's machine IP
- hard-code the old `.gemini` project path

---

# 65. ENVIRONMENT CONFIGURATION

Use `.env.example`.

Potential variables:

```text
GEMINI_API_KEY=

DATABASE_URL=

REDIS_URL=

API_NODE_ID=

CORS_ORIGINS=

TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=

VITE_API_URL=
VITE_API_NODES=
VITE_WS_URL=
```

Never commit actual secrets.

For LAN development, API URL should be configurable.

Example:

```text
http://192.168.1.10:8000
```

For internet:

```text
https://api.example-domain.com
```

---

# 66. WINDOWS DEVELOPMENT

Document commands.

Frontend:

```bash
cd C:\Users\ivibh\OneDrive\Desktop\Hackatroics\resqmap\frontend
npm install
npm run dev -- --host 0.0.0.0
```

Backend:

```bash
cd C:\Users\ivibh\OneDrive\Desktop\Hackatroics\resqmap
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Adjust commands if the final implementation uses a different entry point.

---

# 67. WINDOWS FIREWALL

If LAN devices cannot connect, document opening:

```text
TCP 5173
TCP 8000
```

and any required WebRTC/TURN ports.

Do not disable Windows Firewall entirely as the solution.

---

# 68. ONE DRIVE WARNING

The new path is under:

```text
C:\Users\ivibh\OneDrive\Desktop\Hackatroics
```

This is acceptable for source code, but avoid putting:
- database live files
- secrets
- runtime caches
- large generated media
- node_modules if unnecessary

inside synchronized storage when it could cause locking/sync problems.

Especially do NOT rely on SQLite database files synchronized by OneDrive as a multi-user database.

---

# 69. FINAL SYSTEM BEHAVIOR

The finished system should support this end-to-end scenario:

### Citizen

```text
Opens ResQMap on Android
        ↓
Gets GPS
        ↓
Takes disaster photo
        ↓
Gemini analyzes image
        ↓
Authenticity check
        ↓
Severity + hazard
        ↓
Victim presses SOS
        ↓
SOS receives priority
        ↓
Report sent to backend
```

### Command Center

```text
Receives incident
        ↓
Map updates live
        ↓
SOS queue ranks victims
        ↓
Dispatcher selects responder
        ↓
Responder mission created
```

### First Responder

```text
Receives assignment
        ↓
EN_ROUTE
        ↓
GPS telemetry starts
        ↓
Location appears on command map
        ↓
Responder starts camera
        ↓
Authorized colleagues see live feed
        ↓
ON_SCENE
        ↓
RESOLVED
```

### Database

```text
Incident history
SOS history
Responder history
GPS telemetry
Mission history
Live-feed sessions
```

must remain available.

---

# 70. ACCEPTANCE CRITERIA

The implementation is considered successful only when ALL of these work:

## Core
- [ ] React frontend runs
- [ ] FastAPI backend runs
- [ ] backend health works
- [ ] incidents stored server-side
- [ ] frontend can retrieve incidents

## AI
- [ ] Gemini multimodal classification works
- [ ] fallback works
- [ ] six hazard categories work
- [ ] severity works
- [ ] visual reasoning works
- [ ] authenticity/false-alarm assessment works

## Citizen
- [ ] Android browser works
- [ ] image capture works
- [ ] EXIF GPS works when available
- [ ] live GPS fallback works
- [ ] manual location works
- [ ] SOS works

## SOS
- [ ] SOS priority queue works
- [ ] distance contributes to priority
- [ ] medical/trapped/vulnerability factors contribute
- [ ] dispatcher can override
- [ ] priority updates live

## Responders
- [ ] responder registration/state works
- [ ] dispatch works
- [ ] route/mission history stored
- [ ] status history stored
- [ ] GPS telemetry works
- [ ] responder appears moving on map

## Live Feed
- [ ] local camera preview works
- [ ] rear/front camera selection works
- [ ] responder can broadcast
- [ ] another authorized device can watch
- [ ] multiple feeds can exist
- [ ] LAN mode works
- [ ] internet mode works where properly configured
- [ ] reconnect behavior works

## Multi-physical-system failover
- [ ] two or more teammate computers can host the backend
- [ ] clients can reach the active physical host
- [ ] active physical host can be shut down
- [ ] another physical teammate system can take over
- [ ] frontend can reconnect to the backup physical host
- [ ] shared data remains available

## Hackathon
- [ ] five arbitrary judge images can be classified live
- [ ] visual reasoning is displayed
- [ ] false alarms can be demonstrated
- [ ] incident can be plotted on live map
- [ ] responder can be dispatched
- [ ] live feed can be demonstrated

---

# 71. CRITICAL TERMINOLOGY REMINDER

In this project, **PHYSICAL SYSTEM** means an actual teammate laptop/PC/server machine.

```text
System A = Teammate A's laptop
System B = Teammate B's laptop
System C = Teammate C's laptop
```

It does NOT mean:
- API node
- software microservice
- API endpoint
- process
- container

The required "multisystem server" behavior is physical-machine failover:

```text
Teammate A physical computer
          ↓
      ACTIVE HOST
          ↓
       clients

If that computer goes down:

Teammate B physical computer
          ↓
      TAKEOVER HOST
          ↓
       clients
```

Do not reinterpret this requirement as merely multiple API nodes on one machine.

---

# 71. NEW ANTIGRAVITY CONTINUATION PROMPT

Paste the following into the NEW Antigravity conversation:

> You are taking over an existing hackathon project called ResQMap AI.
>
> READ `RESQMAP_HANDOFF.md` COMPLETELY BEFORE DOING ANYTHING.
>
> The project has been moved to:
>
> `C:\Users\ivibh\OneDrive\Desktop\Hackatroics\resqmap`
>
> This is an existing project. DO NOT rebuild it from scratch.
>
> First inspect the complete codebase and understand what already exists.
>
> The frontend is substantially implemented. Preserve the existing UI, Judge Sandbox, Gemini classifier, fallback classifier, Leaflet map, citizen report flow, EXIF extraction, responder HUD, and existing WebRTC/PeerJS functionality unless there is a concrete reason to modify them.
>
> The biggest missing component is the real backend/server.
>
> Implement the backend incrementally and connect it to the frontend.
>
> CRITICAL REQUIREMENTS:
>
> 1. The application must work from OTHER DEVICES, not just localhost.
> 2. LAN access must work through the host PC's IP.
> 3. Android browser support is required.
> 4. GPS must be robust using EXIF -> live device GPS -> manual map pin fallback.
> 5. Implement real SOS priority based on distance plus medical/trapped/vulnerability/urgency factors.
> 6. Implement responder mission/route history.
> 7. Implement responder GPS telemetry and live map movement.
> 8. Fix the responder local camera preview bug.
> 9. Restrict responder live-camera broadcasting to authorized responder/volunteer roles.
> 10. Multiple authorized colleagues must be able to watch responder live feeds.
> 11. Live feed must work over LAN and be architected for internet WebRTC using STUN/TURN.
> 12. Implement live-feed session metadata and multiple simultaneous feeds.
> 13. Implement backend WebSocket events.
> 14. Implement physical-system failover so if Teammate A's actual computer hosting ResQMap goes down, Teammate B's actual computer can take over.
> 15. Do NOT pretend independent SQLite files on separate laptops are a shared high-availability database. Use a shared database architecture for HA.
> 16. Keep localStorage as an offline/demo cache, but backend should be the source of truth in network mode.
> 17. Keep API keys and secrets out of source code.
> 18. Keep the system cost-effective with Gemini caching/fallback.
>
> IMPORTANT:
>
> Before changing anything, inspect:
>
> `frontend/src/context/DisasterContext.jsx`
> `frontend/src/components/ResponderHub.jsx`
> `frontend/src/services/liveStreamService.js`
> `frontend/src/services/geminiClassifier.js`
> `frontend/src/services/exifService.js`
> `frontend/src/components/JudgeSandbox.jsx`
> `frontend/src/components/LiveMap.jsx`
> `frontend/src/components/CitizenReportModal.jsx`
> `backend/models.py`
>
> Determine what is already implemented and what is only simulated.
>
> Do not fake backend integration.
>
> Do not fake GPS telemetry.
>
> Do not fake live-feed connectivity.
>
> Do not fake multi-server failover.
>
> Build each feature so it actually works, then test it.
>
> Development order:
>
> 1. LAN/mobile access
> 2. FastAPI backend
> 3. Frontend API integration
> 4. SOS priority
> 5. responder database/mission history
> 6. responder GPS telemetry
> 7. local camera preview fix
> 8. live feed/session management
> 9. multi-feed viewing
> 10. multi-node failover
> 11. Android testing
> 12. prepare clean integration boundaries for teammate modules
>
> After each major phase, run the application and verify it instead of assuming it works.
>
> When something cannot work because of browser security, NAT, HTTPS, missing API credentials, or another environmental limitation, explicitly identify the limitation and implement the correct production/development solution rather than hiding it with simulated UI.
