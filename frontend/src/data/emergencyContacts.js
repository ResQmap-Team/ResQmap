// Configurable Emergency Contacts with sensible India-oriented defaults and international structure
// Operators can modify numbers through Settings

export const DEFAULT_EMERGENCY_CONTACTS = [
  {
    id: "nat-emergency",
    name: "National Emergency Helpline",
    number: "112",
    description: "All-in-one unified emergency response (Police, Fire, Ambulance)",
    category: "ALL_EMERGENCIES",
    iconName: "ShieldAlert",
    badgeColor: "rose",
    priority: "CRITICAL",
    open24x7: true,
    website: "https://112.gov.in",
    isDefault: true
  },
  {
    id: "police",
    name: "Police Assistance",
    number: "100",
    description: "Law enforcement, crowd safety & immediate security response",
    category: "SECURITY",
    iconName: "ShieldCheck",
    badgeColor: "blue",
    priority: "HIGH",
    open24x7: true,
    website: "https://mha.gov.in",
    isDefault: true
  },
  {
    id: "fire-rescue",
    name: "Fire & Disaster Rescue",
    number: "101",
    description: "Fire suppression, building collapse evacuation & flood swiftwater rescue",
    category: "FIRE_RESCUE",
    iconName: "Flame",
    badgeColor: "orange",
    priority: "CRITICAL",
    open24x7: true,
    website: "",
    isDefault: true
  },
  {
    id: "ambulance-medical",
    name: "Ambulance & Trauma Medical",
    number: "108",
    description: "Emergency medical transport, trauma care, and paramedic dispatch",
    category: "MEDICAL",
    iconName: "HeartPulse",
    badgeColor: "emerald",
    priority: "CRITICAL",
    open24x7: true,
    website: "",
    isDefault: true
  },
  {
    id: "disaster-mgmt",
    name: "Disaster Management Control Room",
    number: "1070",
    description: "State & District Emergency Operations Centre (SEOC / DEOC) central alert",
    category: "DISASTER_MGMT",
    iconName: "Radio",
    badgeColor: "purple",
    priority: "HIGH",
    open24x7: true,
    website: "https://ndma.gov.in",
    isDefault: true
  },
  {
    id: "ndrf-rescue",
    name: "NDRF HQ Search & Rescue",
    number: "011-24363260",
    description: "National Disaster Response Force specialized urban search & rescue deployment",
    category: "SEARCH_RESCUE",
    iconName: "LifeBuoy",
    badgeColor: "amber",
    priority: "CRITICAL",
    open24x7: true,
    website: "https://www.ndrf.gov.in",
    isDefault: true
  },
  {
    id: "municipal-flood",
    name: "Municipal Emergency & Flood Cell",
    number: "1913",
    description: "Civic flood control, fallen tree clearance, drainage dewatering & road blocks",
    category: "MUNICIPAL",
    iconName: "Building2",
    badgeColor: "teal",
    priority: "MEDIUM",
    open24x7: true,
    website: "",
    isDefault: true
  },
  {
    id: "women-child",
    name: "Women & Child Distress Helpline",
    number: "1091",
    description: "Immediate safety, medical aid, and shelter assistance for vulnerable citizens",
    category: "SAFETY_HELPLINE",
    iconName: "Users",
    badgeColor: "pink",
    priority: "HIGH",
    open24x7: true,
    website: "",
    isDefault: true
  }
];

export const CONTACT_CATEGORIES = [
  { id: "ALL", label: "All Contacts" },
  { id: "SECURITY", label: "Police & Security" },
  { id: "FIRE_RESCUE", label: "Fire & Rescue" },
  { id: "MEDICAL", label: "Ambulance & Medical" },
  { id: "DISASTER_MGMT", label: "Disaster Control" },
  { id: "SEARCH_RESCUE", label: "Search & Rescue" },
  { id: "MUNICIPAL", label: "Municipal & Civic" }
];
