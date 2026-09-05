// Seed incidents enhanced with exact PPT real-world references (Slide 4 & 15),
// P0-P3 priority taxonomy (Slide 7), Corroborated Spatial Clusters (Slide 6), and Event Timelines (Slide 11).

export const SEED_INCIDENTS = [
  {
    id: "RQN-1042",
    title: "Hyderabad Urban Street Inundation & Submerged Vehicles",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    latitude: 17.4474,
    longitude: 78.3745,
    address: "Hitech City Main Rd, Hafeezpet, Hyderabad, Telangana",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    sourceAttribution: "Strike Eagle · Wikimedia Commons · CC BY-SA 4.0",
    hazardCategory: "Flood / Waterlogging",
    priority: "P1", // P0: Critical, P1: High, P2: Medium, P3: Low
    severity: "HIGH",
    status: "EN_ROUTE",
    isRealDisaster: true,
    authenticityScore: 98.2,
    confidence: 0.96,
    isCorroborated: true,
    corroboratedReportsCount: 5,
    affectedRadiusMeters: 420,
    visualFeatures: [
      "Standing muddy floodwater depth > 1.1 meters reaching passenger bus chassis",
      "Multiple passenger auto-rickshaws and sedans submerged to window level",
      "Turbulent stormwater runoff obscuring road dividers and open manholes",
      "Zero passable lanes across 400-meter arterial thoroughfare"
    ],
    recommendedUnits: ["Swiftwater Rescue Boat Unit 17", "Municipal High-Capacity Dewatering Team", "TSSPDCL Power Isolation"],
    dispatchFactors: {
      specializationMatch: 98,
      distanceKm: 3.0,
      etaMins: 7,
      unitAvailability: "Available",
      existingWorkload: "Low (1 task)"
    },
    damageAssessment: "Major urban flash flood blocking primary transit corridor. High vehicle stalling and pedestrian hazard.",
    safetyInstructions: [
      "Move to higher floor or elevated concrete structure immediately",
      "Do NOT walk or drive into standing water of unknown depth",
      "Stay away from street electrical junction poles and submerged meters"
    ],
    reporterName: "Mahesh Chandra",
    reporterPhone: "+91 98490 12345",
    trappedCount: 3,
    needsMedical: false,
    needsBoat: true,
    hasElderlyOrInfants: true,
    notes: "5 nearby citizens reported this intersection within 20 mins. Water level rising fast.",
    assignedUnit: "Disaster Rescue Unit 17",
    responderEtaMinutes: 7,
    responderDistanceKm: 3.0,
    responderNotes: "Unit 17 en route with motorized inflatable boat. ETA 7 mins.",
    eventsTimeline: [
      { time: "11:32 AM", text: "Citizen report #1 received with photo & GPS" },
      { time: "11:32 AM", text: "Tier-1 local model classified Flood (94.2% confidence)" },
      { time: "11:33 AM", text: "Spatial Corroboration: Clustered 5 nearby citizen reports (Radius: 420m)" },
      { time: "11:33 AM", text: "Incident #RQN-1042 created with Priority P1 (HIGH)" },
      { time: "11:34 AM", text: "Disaster Rescue Unit 17 dispatched (Specialization match: 98%)" },
      { time: "11:36 AM", text: "Live GPS & video telemetry link established" }
    ]
  },
  {
    id: "RQN-1043",
    title: "Thane-Bhiwandi Commercial Multi-Storey Building Structural Collapse",
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    latitude: 19.2967,
    longitude: 73.0631,
    address: "Bhiwandi Commercial Industrial Corridor, Thane, Maharashtra, India",
    imageUrl: "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=800&q=80",
    sourceAttribution: "Disaster Documentation · CC BY 2.5",
    hazardCategory: "Structural Damage / Building Collapse",
    priority: "P0",
    severity: "CRITICAL",
    status: "ON_SCENE",
    isRealDisaster: true,
    authenticityScore: 99.4,
    confidence: 0.98,
    isCorroborated: true,
    corroboratedReportsCount: 8,
    affectedRadiusMeters: 250,
    visualFeatures: [
      "Catastrophic failure of lower-tier reinforced concrete load-bearing pillars",
      "Pancake collapse pattern of upper masonry slabs with exposed twisted rebar",
      "Heavy pulverized concrete dust particulate cloud across street perimeter",
      "Trapped survivors identified in void spaces beneath second floor span"
    ],
    recommendedUnits: ["Urban Search & Rescue (USAR Heavy 01)", "Acoustic Void Listening Team", "Trauma Paramedic Squad"],
    dispatchFactors: {
      specializationMatch: 100,
      distanceKm: 1.2,
      etaMins: 0,
      unitAvailability: "On Scene",
      existingWorkload: "Active (P0 Primary)"
    },
    damageAssessment: "P0 CRITICAL: Catastrophic structural collapse with trapped occupants. Imminent secondary shifting risk.",
    safetyInstructions: [
      "Maintain a strict 50-meter safety cordon; prevent crowd rush",
      "Do NOT enter unstable debris piles without structural shoring",
      "Silence all heavy machinery during acoustic search intervals"
    ],
    reporterName: "Dr. Ananya Roy",
    reporterPhone: "+91 98830 55667",
    trappedCount: 6,
    needsMedical: true,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Multiple people trapped in front pharmacy and textile office. Screams heard from rubble.",
    assignedUnit: "USAR Heavy Squad 1",
    responderEtaMinutes: 0,
    responderDistanceKm: 0.0,
    responderNotes: "USAR Unit 01 on scene. Hydraulic jacks and acoustic microphones deployed.",
    eventsTimeline: [
      { time: "10:45 AM", text: "Multiple SOS reports received from Bhiwandi bypass" },
      { time: "10:45 AM", text: "AI Vision triggered P0 Critical Severity (Triage Score: 99/100)" },
      { time: "10:46 AM", text: "Incident #RQN-1043 created · 8 independent submissions merged" },
      { time: "10:47 AM", text: "USAR Heavy Squad 1 dispatched with acoustic sensors" },
      { time: "10:52 AM", text: "Unit arrived ON SCENE · Perimeter established" }
    ]
  },
  {
    id: "RQN-1044",
    title: "Nedumpoil Ghat Road Landslide & Mountain Slope Failure",
    createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    latitude: 11.8762,
    longitude: 75.8344,
    address: "Nedumpoil Ghat Pass, Kannur-Mananthavady Highway, Kerala",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    sourceAttribution: "Vinayaraj · Wikimedia Commons · CC BY-SA 4.0",
    hazardCategory: "Landslide / Mudslide",
    priority: "P1",
    severity: "HIGH",
    status: "DISPATCHED",
    isRealDisaster: true,
    authenticityScore: 96.5,
    confidence: 0.94,
    isCorroborated: true,
    corroboratedReportsCount: 3,
    affectedRadiusMeters: 600,
    visualFeatures: [
      "Overburden soil and rock mass slippage blocking both carriageways",
      "Uprooted mature timber and severed overhead telecom utility cables",
      "Active muddy runoff continuing down upper cut-slope",
      "Total severance of interstate mountain transit corridor"
    ],
    recommendedUnits: ["Highways Heavy Excavator Unit", "Geotechnical Survey Team", "Kerala Fire & Rescue Patrol"],
    dispatchFactors: {
      specializationMatch: 95,
      distanceKm: 4.8,
      etaMins: 11,
      unitAvailability: "Available",
      existingWorkload: "Moderate"
    },
    damageAssessment: "Major hillside earth movement cutting off vehicular transit across ghat section.",
    safetyInstructions: [
      "Do NOT attempt to cross mud on foot or two-wheelers; secondary slips likely",
      "Park vehicles at least 200m away from unstable slope base",
      "Follow traffic diversion via Koothuparamba route"
    ],
    reporterName: "Sujith Narayanan",
    reporterPhone: "+91 94470 44556",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Hillside slipped during heavy monsoon spell. Bus passengers stranded on lower bend.",
    assignedUnit: "Highways Heavy Clearing Unit 4",
    responderEtaMinutes: 11,
    responderDistanceKm: 4.8,
    responderNotes: "Earthmovers en route from Kannur depot.",
    eventsTimeline: [
      { time: "09:50 AM", text: "Ghat traveler uploaded slope failure photo with GPS" },
      { time: "09:51 AM", text: "Classified as Landslide / Slope Failure (P1 HIGH)" },
      { time: "09:52 AM", text: "Merged 3 corroborating reports along 600m mountain stretch" },
      { time: "09:54 AM", text: "Heavy Excavator Unit 4 dispatched" }
    ]
  },
  {
    id: "RQN-1045",
    title: "Wildfire Propagation & Dense Smoke Plume in Forest Belt",
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    latitude: 19.0760,
    longitude: 73.8777,
    address: "Western Ghats Forest Range, Maharashtra, India",
    imageUrl: "https://images.unsplash.com/photo-1602980085566-4c9f1b95b77c?auto=format&fit=crop&w=800&q=80",
    sourceAttribution: "Ayesha46 · Wikimedia Commons · CC BY-SA 4.0",
    hazardCategory: "Fire / Wildfire / Smoke",
    priority: "P1",
    severity: "HIGH",
    status: "DISPATCHED",
    isRealDisaster: true,
    authenticityScore: 98.9,
    confidence: 0.97,
    isCorroborated: true,
    corroboratedReportsCount: 4,
    affectedRadiusMeters: 850,
    visualFeatures: [
      "Active moving flame front across dry deciduous canopy and undergrowth",
      "Dense billowing grey-black carbon smoke column reducing visibility to <15m",
      "Strong crosswinds driving ember spread toward nearby rural settlements",
      "Elevated thermal gradient detected across forest road corridor"
    ],
    recommendedUnits: ["Forest Department Wildfire Strike Unit", "Foam Tender Fire Engine 08", "Air Quality Monitor Squad"],
    dispatchFactors: {
      specializationMatch: 97,
      distanceKm: 5.4,
      etaMins: 14,
      unitAvailability: "Available",
      existingWorkload: "Low"
    },
    damageAssessment: "Active forest wildfire threatening eco-sensitive zone and nearby village fringes.",
    safetyInstructions: [
      "Evacuate downwind villages immediately along designated firebreak roads",
      "Wear N95 or moist cloth masks to prevent smoke inhalation",
      "Clear combustible dried leaves away from residential perimeters"
    ],
    reporterName: "Forest Guard Shinde",
    reporterPhone: "+91 98220 88990",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Fire spreading rapidly due to 35 km/h winds. 4 nearby villagers called emergency dispatch.",
    assignedUnit: "Forest Strike Team Alpha",
    responderEtaMinutes: 14,
    responderDistanceKm: 5.4,
    responderNotes: "Strike team setting backburn line and deploying water tankers.",
    eventsTimeline: [
      { time: "09:10 AM", text: "Forest guard submitted smoke column photograph" },
      { time: "09:11 AM", text: "AI verified active wildfire & toxic particulate plume" },
      { time: "09:12 AM", text: "Corroborated 4 reports across 850m perimeter" },
      { time: "09:15 AM", text: "Forest Strike Team Alpha dispatched" }
    ]
  },
  {
    id: "RQN-1046",
    title: "High-Voltage Utility Line Severed Across Commuter Artery",
    createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    latitude: 12.9150,
    longitude: 80.2280,
    address: "OMR IT Expressway, Sholinganallur, Chennai",
    imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Downed Powerlines / Electrical Hazard",
    priority: "P0",
    severity: "CRITICAL",
    status: "EN_ROUTE",
    isRealDisaster: true,
    authenticityScore: 97.1,
    confidence: 0.95,
    isCorroborated: true,
    corroboratedReportsCount: 3,
    affectedRadiusMeters: 180,
    visualFeatures: [
      "Severed 11kV overhead phase line immersed in standing stormwater",
      "Severe electrocution arc and thermal steam vapor visible at conductor tip",
      "Compromised concrete utility pole tilted across pedestrian footpath",
      "Extreme risk of lethal touch/step voltage gradient within 20m radius"
    ],
    recommendedUnits: ["TNEB High-Voltage Grid Isolation Team", "Highway Traffic Interceptor Unit"],
    dispatchFactors: {
      specializationMatch: 99,
      distanceKm: 2.1,
      etaMins: 5,
      unitAvailability: "Available",
      existingWorkload: "Low"
    },
    damageAssessment: "P0 Critical: Active live high-voltage conductor submerged in water on heavy commuter corridor.",
    safetyInstructions: [
      "Maintain a minimum 20-meter (65-ft) distance from fallen wire and wet pavement",
      "Do NOT step out of stopped vehicles if touching or near the wire",
      "Warn pedestrians to avoid metal railings and roadside pools"
    ],
    reporterName: "Venkatesh Babu",
    reporterPhone: "+91 97910 54321",
    trappedCount: 1,
    needsMedical: false,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Bus stopped right before wire. Conductor arcing in rain water.",
    assignedUnit: "TNEB Rapid Isolation Team 3",
    responderEtaMinutes: 5,
    responderDistanceKm: 2.1,
    responderNotes: "Remote grid trip initiated. Field crew en route to verify isolation.",
    eventsTimeline: [
      { time: "08:40 AM", text: "Commuter flagged live arcing powerline with photo" },
      { time: "08:40 AM", text: "Classified P0 Critical Electrical Hazard" },
      { time: "08:41 AM", text: "TNEB Substation breaker remote alert triggered" },
      { time: "08:42 AM", text: "TNEB Rapid Isolation Team 3 dispatched (ETA 5 mins)" }
    ]
  },
  {
    id: "RQN-1047",
    title: "VIT Chennai South Campus Drainage Overflow",
    createdAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    latitude: 12.8406,
    longitude: 80.1534,
    address: "VIT Chennai Campus Gate 2, Vandalur-Kelambakkam Rd",
    imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Flood / Waterlogging",
    priority: "P3",
    severity: "LOW",
    status: "RESOLVED",
    isRealDisaster: true,
    authenticityScore: 92.0,
    confidence: 0.90,
    isCorroborated: false,
    corroboratedReportsCount: 1,
    affectedRadiusMeters: 50,
    visualFeatures: [
      "Minor ankle-deep surface water accumulation (10 cm) at drainage curb",
      "No structural or vehicle submersion identified",
      "Pedestrian footway navigable with normal precautions",
      "Stormwater drain functioning at steady outflow rate"
    ],
    recommendedUnits: ["Campus Estate Maintenance Crew"],
    dispatchFactors: {
      specializationMatch: 90,
      distanceKm: 0.2,
      etaMins: 0,
      unitAvailability: "Completed",
      existingWorkload: "None"
    },
    damageAssessment: "P3 Monitor: Localized nuisance runoff resolved by estate maintenance staff.",
    safetyInstructions: [
      "Use elevated walkway. Situation cleared."
    ],
    reporterName: "Student Security Volunteer",
    reporterPhone: "+91 99620 33445",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Maintenance cleared grates. Water drained completely.",
    assignedUnit: "Campus Maintenance Unit",
    responderEtaMinutes: 0,
    responderDistanceKm: 0.0,
    responderNotes: "Debris cleared from drain entrance. Road dry.",
    eventsTimeline: [
      { time: "08:15 AM", text: "Report submitted via Student App" },
      { time: "08:16 AM", text: "AI classified as P3 (Low - Localized Overflow)" },
      { time: "08:18 AM", text: "Campus maintenance cleared grates" },
      { time: "08:35 AM", text: "Incident marked RESOLVED" }
    ]
  },
  {
    id: "RQN-1049",
    title: "Mumbai Dadar-Hindmata Monsoon Submersion & Transit Paralysis",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    latitude: 19.0178,
    longitude: 72.8478,
    address: "Hindmata Flyover Underpass, Dadar East, Mumbai, Maharashtra",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Flood / Waterlogging",
    priority: "P0",
    severity: "CRITICAL",
    status: "DISPATCHED",
    isRealDisaster: true,
    authenticityScore: 98.6,
    confidence: 0.97,
    isCorroborated: true,
    corroboratedReportsCount: 6,
    affectedRadiusMeters: 550,
    visualFeatures: [
      "Deep standing floodwater >1.3m across central railway underpass",
      "Multiple BEST passenger buses stranded with passengers evacuated",
      "Stormwater drain backflow visible at road junction"
    ],
    recommendedUnits: ["NDRF Battalion 5 Swiftwater Unit", "MCGM High-Volume Dewatering Crew"],
    dispatchFactors: {
      specializationMatch: 99,
      distanceKm: 1.8,
      etaMins: 4,
      unitAvailability: "Available",
      existingWorkload: "Active"
    },
    damageAssessment: "P0 CRITICAL: Major low-lying arterial transit route completely submerged. Heavy dewatering pumps deployed.",
    safetyInstructions: [
      "Avoid traveling through Dadar/Hindmata underpass corridors",
      "Do NOT walk near open manholes or stormwater culverts"
    ],
    reporterName: "Rajesh Kulkarni",
    reporterPhone: "+91 98200 11223",
    trappedCount: 2,
    needsMedical: false,
    needsBoat: true,
    hasElderlyOrInfants: false,
    notes: "Water rising fast with incoming high tide.",
    assignedUnit: "MCGM Emergency Unit 4",
    responderEtaMinutes: 4,
    responderDistanceKm: 1.8,
    responderNotes: "Dewatering pumps in operation.",
    eventsTimeline: [
      { time: "07:20 AM", text: "Multiple commuter alerts received" },
      { time: "07:21 AM", text: "AI verified deep waterlogging (Triage P0)" },
      { time: "07:23 AM", text: "MCGM Emergency Unit 4 dispatched" }
    ]
  },
  {
    id: "RQN-1050",
    title: "Delhi Yamuna Floodplain Low-Lying Breach & Inundation",
    createdAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    latitude: 28.6675,
    longitude: 77.2285,
    address: "Ring Road, Kashmere Gate Monastery Market, New Delhi",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Flood / Waterlogging",
    priority: "P1",
    severity: "HIGH",
    status: "EN_ROUTE",
    isRealDisaster: true,
    authenticityScore: 97.8,
    confidence: 0.95,
    isCorroborated: true,
    corroboratedReportsCount: 4,
    affectedRadiusMeters: 700,
    visualFeatures: [
      "River overflow water spreading across Ring Road carriageway",
      "Commercial market basements flooded with 1m water",
      "Sandbag embankments partially breached"
    ],
    recommendedUnits: ["Delhi Disaster Management Authority Quick Response Team", "Boat Patrol 02"],
    dispatchFactors: {
      specializationMatch: 96,
      distanceKm: 2.5,
      etaMins: 6,
      unitAvailability: "Available",
      existingWorkload: "Moderate"
    },
    damageAssessment: "P1 HIGH: Yamuna water level above danger mark causing localized overflow into ring road market.",
    safetyInstructions: [
      "Evacuate basement shops and move stock to upper floors",
      "Follow traffic diversions via Civil Lines"
    ],
    reporterName: "Praveen Sharma",
    reporterPhone: "+91 98110 99887",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: true,
    hasElderlyOrInfants: false,
    notes: "River water entering market area.",
    assignedUnit: "DDMA Rescue Unit 2",
    responderEtaMinutes: 6,
    responderDistanceKm: 2.5,
    responderNotes: "Sandbag reinforcements en route.",
    eventsTimeline: [
      { time: "06:50 AM", text: "Market association flagged water ingress" },
      { time: "06:52 AM", text: "DDMA Rescue Unit 2 deployed" }
    ]
  },
  {
    id: "RQN-1051",
    title: "Bengaluru Bellandur Outer Ring Road Stormwater Drain Overflow",
    createdAt: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
    latitude: 12.9298,
    longitude: 77.6848,
    address: "Outer Ring Road, Bellandur EcoSpace Junction, Bengaluru, Karnataka",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Flood / Waterlogging",
    priority: "P1",
    severity: "HIGH",
    status: "DISPATCHED",
    isRealDisaster: true,
    authenticityScore: 96.9,
    confidence: 0.94,
    isCorroborated: true,
    corroboratedReportsCount: 5,
    affectedRadiusMeters: 450,
    visualFeatures: [
      "Stormwater drain overflow spilling onto service roads",
      "Tech park entrance blocked with knee-deep water",
      "Traffic gridlock extending 2 km on ORR"
    ],
    recommendedUnits: ["BBMP Stormwater Drain Clearing Team", "Traffic Emergency Unit"],
    dispatchFactors: {
      specializationMatch: 95,
      distanceKm: 3.2,
      etaMins: 8,
      unitAvailability: "Available",
      existingWorkload: "Moderate"
    },
    damageAssessment: "P1 HIGH: Tech park corridor blocked by stormwater drain overflow.",
    safetyInstructions: [
      "Use alternate Marathahalli route",
      "Do NOT drive small vehicles into flooded service lanes"
    ],
    reporterName: "Karthik Swaminathan",
    reporterPhone: "+91 99000 77665",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Service road flooded. Commuters stranded.",
    assignedUnit: "BBMP Quick Response Team 9",
    responderEtaMinutes: 8,
    responderDistanceKm: 3.2,
    responderNotes: "Dewatering tractors deployed.",
    eventsTimeline: [
      { time: "06:15 AM", text: "ORR commuter reported drain overflow" },
      { time: "06:18 AM", text: "BBMP Team 9 dispatched" }
    ]
  },
  {
    id: "RQN-1052",
    title: "Rishikesh-Chamoli Mountain Cloudburst & Debris Slurry Flow",
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    latitude: 30.0869,
    longitude: 78.2676,
    address: "Badrinath National Highway, Rishikesh-Devprayag Stretch, Uttarakhand",
    imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Landslide / Mudslide",
    priority: "P0",
    severity: "CRITICAL",
    status: "EN_ROUTE",
    isRealDisaster: true,
    authenticityScore: 99.1,
    confidence: 0.98,
    isCorroborated: true,
    corroboratedReportsCount: 4,
    affectedRadiusMeters: 600,
    visualFeatures: [
      "Heavy boulder and mud slurry torrent cutting across national highway",
      "Pilgrim vehicle partially pushed to road embankment edge",
      "Continuous mountain runoff carrying loose shale and timber"
    ],
    recommendedUnits: ["SDRF Uttarakhand Mountain Rescue Team", "BRO Heavy Bulldozer Squad"],
    dispatchFactors: {
      specializationMatch: 99,
      distanceKm: 4.1,
      etaMins: 9,
      unitAvailability: "Available",
      existingWorkload: "High (P0)"
    },
    damageAssessment: "P0 CRITICAL: Mountain highway blocked by sudden cloudburst debris slurry flow.",
    safetyInstructions: [
      "Halt all vehicle movement along highway stretch",
      "Stay away from hillside gullies and natural water channels"
    ],
    reporterName: "Rameshwar Rawat",
    reporterPhone: "+91 94120 33221",
    trappedCount: 4,
    needsMedical: true,
    needsBoat: false,
    hasElderlyOrInfants: true,
    notes: "4 pilgrims trapped in stalled SUV near culvert. Boulder slide active.",
    assignedUnit: "SDRF Mountain Rescue Team 1",
    responderEtaMinutes: 9,
    responderDistanceKm: 4.1,
    responderNotes: "Rescue team en route with winch gear.",
    eventsTimeline: [
      { time: "05:40 AM", text: "Urgent SOS received with photo of debris flow" },
      { time: "05:41 AM", text: "AI triggered P0 Critical Rescue priority" },
      { time: "05:43 AM", text: "SDRF Mountain Team 1 dispatched" }
    ]
  },
  {
    id: "RQN-1053",
    title: "Kaziranga National Park Floodplain Submersion & Animal Corridor Alert",
    createdAt: new Date(Date.now() - 1000 * 60 * 350).toISOString(),
    latitude: 26.5775,
    longitude: 93.1711,
    address: "NH-715 Highway Animal Corridor, Kaziranga, Assam",
    imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Flood / Waterlogging",
    priority: "P1",
    severity: "HIGH",
    status: "DISPATCHED",
    isRealDisaster: true,
    authenticityScore: 98.0,
    confidence: 0.96,
    isCorroborated: true,
    corroboratedReportsCount: 3,
    affectedRadiusMeters: 1200,
    visualFeatures: [
      "Brahmaputra floodwaters overflowing national highway culverts",
      "Animal crossing corridors inundated with 1m water",
      "Speed limits enforced to protect migrating wildlife"
    ],
    recommendedUnits: ["Assam Forest Protection Force", "NDRF Water Rescue Unit"],
    dispatchFactors: {
      specializationMatch: 97,
      distanceKm: 3.5,
      etaMins: 7,
      unitAvailability: "Available",
      existingWorkload: "Moderate"
    },
    damageAssessment: "P1 HIGH: Highway flooded along wildlife sanctuary periphery.",
    safetyInstructions: [
      "Drive under 20 km/h with hazard lights on",
      "Yield strictly to wildlife moving toward Karbi Anglong hills"
    ],
    reporterName: "Forest Ranger Barua",
    reporterPhone: "+91 94350 88776",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: true,
    hasElderlyOrInfants: false,
    notes: "River rising. Highway regulated by forest guards.",
    assignedUnit: "Forest Rapid Patrol 3",
    responderEtaMinutes: 7,
    responderDistanceKm: 3.5,
    responderNotes: "Patrol unit managing vehicle convoys.",
    eventsTimeline: [
      { time: "05:00 AM", text: "Forest guard submitted flood report" },
      { time: "05:04 AM", text: "Forest Patrol 3 dispatched" }
    ]
  },
  {
    id: "RQN-1048",
    title: "FLAGGED FALSE ALARM: Spilled Coffee on Office Desk (Prank Test)",
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    latitude: 12.9900,
    longitude: 80.2100,
    address: "Office Space, Guindy, Chennai",
    imageUrl: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
    hazardCategory: "Other Hazard",
    priority: "P3",
    severity: "LOW",
    status: "FLAGGED_FALSE_ALARM",
    isRealDisaster: false,
    authenticityScore: 6.5,
    confidence: 0.99,
    falseAlarmReason: "Image shows an indoor domestic setting with a spilled coffee cup on a computer desk. No outdoor damage, flash flood, structural compromise, or emergency hazard detected.",
    isCorroborated: false,
    corroboratedReportsCount: 0,
    affectedRadiusMeters: 0,
    visualFeatures: [
      "Indoor domestic office setting with computer monitor and ceramic cup",
      "Minor non-hazardous liquid spill (< 150ml) on wooden surface",
      "Absence of any real-world emergency or hazard evidence",
      "Automated fraud filtering triggered"
    ],
    recommendedUnits: [],
    dispatchFactors: null,
    damageAssessment: "AUTO-BLOCKED: Non-emergency domestic spill. Excluded from dispatcher queue.",
    safetyInstructions: [
      "Clean spill with cloth. Emergency channels are reserved for real disasters."
    ],
    reporterName: "Anonymous User (Flagged)",
    reporterPhone: "+91 90000 00000",
    trappedCount: 0,
    needsMedical: false,
    needsBoat: false,
    hasElderlyOrInfants: false,
    notes: "Blocked by AI Authenticity Verification Engine.",
    assignedUnit: null,
    responderEtaMinutes: null,
    responderDistanceKm: null,
    responderNotes: "Rejected automatically.",
    eventsTimeline: [
      { time: "07:50 AM", text: "Photo uploaded by anonymous user" },
      { time: "07:50 AM", text: "AI Authenticity Check: 6.5% Real (FRAUD DETECTED)" },
      { time: "07:50 AM", text: "Incident FLAGGED as False Alarm · Dispatch blocked" }
    ]
  }
];

export const HAZARD_CATEGORIES = [
  "Flood / Waterlogging",
  "Structural Damage / Building Collapse",
  "Fire / Wildfire / Smoke",
  "Landslide / Mudslide",
  "Downed Powerlines / Electrical Hazard",
  "Road Obstruction / Debris",
  "Other Hazard"
];

export const PRIORITY_CONFIG = {
  P0: {
    code: "P0",
    label: "CRITICAL",
    action: "Immediate",
    color: "text-rose-400",
    bg: "bg-rose-500/20",
    border: "border-rose-500/40",
    badge: "bg-rose-600 text-white font-black",
    description: "Structural collapse · People trapped · Life-threatening"
  },
  P1: {
    code: "P1",
    label: "HIGH",
    action: "Rapid",
    color: "text-orange-400",
    bg: "bg-orange-500/20",
    border: "border-orange-500/40",
    badge: "bg-orange-600 text-white font-black",
    description: "Major flood blocking road/settlement · Fire front"
  },
  P2: {
    code: "P2",
    label: "MEDIUM",
    action: "Normal",
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/40",
    badge: "bg-yellow-600 text-white font-black",
    description: "Localized flooding / road obstruction"
  },
  P3: {
    code: "P3",
    label: "LOW",
    action: "Monitor",
    color: "text-sky-400",
    bg: "bg-sky-500/20",
    border: "border-sky-500/40",
    badge: "bg-sky-600 text-white font-black",
    description: "Minor damage with no immediate threat"
  }
};

export const SEVERITY_CONFIG = {
  CRITICAL: PRIORITY_CONFIG.P0,
  HIGH: PRIORITY_CONFIG.P1,
  MEDIUM: PRIORITY_CONFIG.P2,
  LOW: PRIORITY_CONFIG.P3
};
