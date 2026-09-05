# 🚨 ResQMap AI — Citizen-Reported Disaster Damage Mapping & First Responder Feed

**ResQMap AI** is an intelligent, real-time disaster damage mapping and first responder coordination system built for emergency disaster triage and hackathon evaluation.

It ingests ground-level citizen disaster photos shot under challenging conditions (poor light, tilted angles, blur, rain), utilizes **Google Gemini 3.7 / 2.5 Flash Multimodal Vision AI** to classify damage into 6 distinct hazard categories, estimates severity, provides explainable visual feature rationales, filters out false alarms/hoaxes, plots geotagged incidents on a live response map, and connects first responders with a live video feed & navigation HUD.

---

## 🌟 Key Features

### 1. 🔍 Multimodal AI Damage Classifier & Explainability Engine
- **6 Distinct Hazard Categories**:
  - 🌊 `Flood / Waterlogging`
  - 🏚️ `Structural Damage / Building Collapse`
  - 🔥 `Fire / Wildfire / Smoke`
  - ⛰️ `Landslide / Mudslide`
  - ⚡ `Downed Powerlines / Electrical Hazard`
  - 🚧 `Road Obstruction / Debris`
- **Severity Estimation**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` with suggested rescue unit allocation.
- **Explainability (XAI)**: Outputs bulleted lists detailing the **exact visual features** (e.g. *water depth exceeding vehicle wheel arches*, *shear cracks across concrete load-bearing pillars*, *toxic hydrocarbon soot plume*, *severed 11kV copper cables in standing water*).
- **Real Disaster vs False Alarm Detector**: Distinguishes genuine crises from non-emergencies (memes, indoor selfies, spilled coffee, peaceful parks) with an Authenticity Confidence Score (`0-100%`).
- **Offline / Hybrid Fallback**: Includes a built-in computer vision analyzer so the app works seamlessly even without an internet connection or API key during live stage demos.

### 2. 📸 Citizen SOS Capture Flow
- Drag-and-drop disaster photo upload with live camera snapshot.
- **Automated EXIF GPS Extraction**: Automatically parses latitude, longitude, and device metadata from camera photos.
- One-tap browser geolocation (`navigator.geolocation`) & manual coordinate adjustments.
- Real-time AI Pre-Triage preview with instant victim safety instructions.
- Urgency questionnaire: number of trapped victims, medical emergencies, infant/elderly presence, rescue boat requirements.

### 3. 🗺️ Live Response Map & Command Center
- Full-screen Leaflet tactical map with custom pulsing severity rings (`Red = Critical`, `Orange = High`, `Yellow = Medium`, `Blue = Low`).
- Interactive filter bar: Hazard Pills, Severity Checkboxes, Verified Real Only toggle, Search bar.
- Tile layers: Dark Tactical, Satellite View, Standard Street.
- Slide-over **Incident Drawer**: High-res photo inspection, visual feature breakdown, authenticity verification badge, victim urgency checklist, and 1-click responder dispatch.

### 4. 🚨 First Responder Live Video Feed & Navigation HUD
- Live camera / smartphone video stream (`getUserMedia`) connecting responders approaching the victim location.
- 3 built-in realistic simulated tactical bodycam & thermal drone feeds.
- **Tactical Navigation HUD**:
  - Live Compass Heading (e.g. `048° NE`)
  - Target Vector Telemetry: Distance (km) countdown and ETA (mins)
  - Night Vision (Green Phosphor) and Thermal Heatmap visual modes
  - Audio Radio Roger Beep communication simulator
  - Mission lifecycle state switcher: `DISPATCHED` ➔ `EN_ROUTE` ➔ `ON_SCENE` ➔ `RESOLVED` (with celebratory resolution confetti!).

### 5. ⚖️ Hackathon Judge Evaluation Sandbox
- Designed specifically for the judging criterion: *"At least five images chosen live by the judges — not the team’s own demonstration images — classified on the spot, with the team explaining which visual features drove each call."*
- Upload or paste (`Ctrl+V`) any image chosen by judges live on stage.
- 5 pre-configured instant live test benchmarks.
- Side-by-side Visual Feature Reasoning, Category Confidence, and Fraud/False Alarm score.
- "Plot to Live Response Map" button to prove full end-to-end operational integration.

---

## 🚀 Quick Start Guide

### 1. Run the Frontend App
```bash
cd C:\Users\ivibh\.gemini\antigravity\scratch\resqmap\frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Configure Gemini API Key (Optional)
Click the **⚙️ Settings** icon in the top right navbar to enter your Google Gemini API Key.
*(If omitted, the app automatically runs in Smart Hybrid Fallback mode with full visual feature explainability).*

### 3. Connecting Teammate's Backend Server
When your teammate has deployed their backend server, open **⚙️ Settings** and enter their server URL (e.g., `http://localhost:8000`).

---

## 📁 Project Structure

```
resqmap/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Top tactical navigation & live emergency ticker
│   │   │   ├── StatsBar.jsx            # Live triage metric counters
│   │   │   ├── LiveMap.jsx             # Interactive Leaflet map with pulsing hazard markers
│   │   │   ├── IncidentDrawer.jsx      # Slide-over damage inspector & dispatch panel
│   │   │   ├── CitizenReportModal.jsx  # Citizen capture flow with EXIF GPS & AI pre-triage
│   │   │   ├── ResponderHub.jsx        # First responder live video stream & tactical HUD
│   │   │   ├── JudgeSandbox.jsx        # Live judge test sandbox with explainability
│   │   │   ├── AnalyticsView.jsx       # Hazard breakdown & fleet readiness analytics
│   │   │   └── SettingsModal.jsx       # API key, teammate server endpoint & demo reset
│   │   ├── context/
│   │   │   └── DisasterContext.jsx     # Central state management & localStorage persistence
│   │   ├── data/
│   │   │   └── seedIncidents.js        # Realistic Chennai / VIT disaster seed dataset
│   │   ├── services/
│   │   │   ├── geminiClassifier.js     # Gemini 3.7 Vision API + Smart Hybrid Fallback
│   │   │   └── exifService.js          # EXIF metadata & GPS coordinate extractor
│   │   ├── App.jsx                     # Master application shell
│   │   ├── index.css                   # Tactical Tailwind styling & Leaflet animations
│   │   └── main.jsx                    # React entry point
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```
