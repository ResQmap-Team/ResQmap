// Volunteer Skills, Impact Matrix & Dynamic Incident Task Generator

export const VOLUNTEER_SKILLS = [
  { id: "First Aid", label: "First Aid & CPR", icon: "HeartPulse", category: "Medical" },
  { id: "Medical Assistance", label: "Medical Assistance / Nursing", icon: "Stethoscope", category: "Medical" },
  { id: "Search & Rescue", label: "Search & Rescue", icon: "LifeBuoy", category: "Rescue" },
  { id: "Evacuation Support", label: "Evacuation Support", icon: "Users", category: "Rescue" },
  { id: "Food Distribution", label: "Food & Ration Distribution", icon: "Utensils", category: "Relief" },
  { id: "Water Distribution", label: "Clean Water Logistics", icon: "Droplets", category: "Relief" },
  { id: "Logistics", label: "Supply Chain & Logistics", icon: "Package", category: "Operations" },
  { id: "Driving", label: "Emergency Driving (4x4/Truck/Van)", icon: "Truck", category: "Transport" },
  { id: "Damage Verification", label: "Ground Damage Verification", icon: "Camera", category: "Field" },
  { id: "Translation", label: "Multi-Language Translation", icon: "Languages", category: "Communication" },
  { id: "Crowd Management", label: "Crowd Safety & Marshalling", icon: "Shield", category: "Operations" },
  { id: "Communication", label: "HAM / Radio Communication", icon: "Radio", category: "Communication" },
  { id: "Shelter Support", label: "SafeHouse & Shelter Operations", icon: "Home", category: "Relief" }
];

export const DEFAULT_VOLUNTEER_PROFILE = {
  name: "Arjun Reddy",
  phone: "+91 98490 77889",
  locationName: "Madhapur, Hyderabad, Telangana",
  latitude: 17.4474,
  longitude: 78.3745,
  skills: ["First Aid", "Evacuation Support", "Water Distribution", "Driving"],
  availability: "AVAILABLE", // "AVAILABLE" | "BUSY" | "OFFLINE"
  vehicleAvailable: true,
  vehicleType: "4x4 SUV & Offroad Utility",
  firstAidTrained: true,
  equipment: ["First Aid Kit", "Heavy Duty Flashlight", "Tow Ropes", "Water Cans (40L)", "Reflective High-Vis Vest"],
  languages: ["English", "Telugu", "Hindi", "Tamil"],
  preferredTaskTypes: ["Evacuation", "Relief Logistics", "First Aid"]
};

export const DEFAULT_VOLUNTEER_IMPACT = {
  score: 145,
  tasksCompleted: 8,
  peopleAssisted: 34,
  rankTitle: "Lead Community Responder",
  badgeLevel: "GOLD",
  history: [
    { id: "hist-1", title: "Flood victim evacuation assist at Hitech City", points: 20, date: "Yesterday", type: "EVACUATION" },
    { id: "hist-2", title: "Emergency drinking water logistics at relief point", points: 10, date: "2 days ago", type: "LOGISTICS" },
    { id: "hist-3", title: "First aid dressing for injured pedestrian", points: 15, date: "3 days ago", type: "FIRST_AID" }
  ]
};

/**
 * Dynamically generate realistic community volunteer tasks mapped from active incidents
 */
export function generateTasksFromIncidents(incidents = [], userLat = 17.4474, userLng = 78.3745, userSkills = []) {
  if (!Array.isArray(incidents) || incidents.length === 0) {
    return [];
  }

  // Filter out resolved or false alarm incidents for active volunteer tasks
  const activeIncidents = incidents.filter(i => i.isRealDisaster && i.status !== 'RESOLVED');

  const generatedTasks = [];

  activeIncidents.forEach((inc, idx) => {
    // Determine appropriate tasks based on hazard category & incident properties
    const cat = inc.hazardCategory || "";
    
    // 1. Evacuation / High Priority Task for P0/P1
    if (inc.priority === 'P0' || inc.priority === 'P1' || inc.trappedCount > 0 || inc.needsBoat) {
      generatedTasks.push({
        id: `TSK-${inc.id}-EVAC`,
        incidentId: inc.id,
        title: `Assist Evacuation & Safe Perimeter: ${inc.title.substring(0, 48)}...`,
        category: "Evacuation Support",
        priority: inc.priority || "P1",
        latitude: inc.latitude,
        longitude: inc.longitude,
        address: inc.address,
        requiredSkills: ["Evacuation Support", "First Aid", "Driving"],
        peopleAffected: inc.trappedCount > 0 ? inc.trappedCount + 8 : 12,
        impactPoints: inc.priority === 'P0' ? 20 : 15,
        estimatedDuration: "45 min",
        status: "AVAILABLE", // "AVAILABLE" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED"
        description: `Support on-scene teams with civilian guiding, safe standoff perimeter, and escorting elderly residents to transport vehicles.`,
        urgency: "HIGH",
        equipmentNeeded: "High-Vis Vest, Flashlight, Rope"
      });
    }

    // 2. Relief / Distribution Task for Floods / Landslides / Shelters
    if (cat.includes('Flood') || cat.includes('Landslide') || inc.hasElderlyOrInfants) {
      generatedTasks.push({
        id: `TSK-${inc.id}-RELIEF`,
        incidentId: inc.id,
        title: `Emergency Drinking Water & Ration Distribution near ${inc.address.split(',')[0]}`,
        category: "Water Distribution",
        priority: "P2",
        latitude: inc.latitude + 0.002, // slightly offset relief point
        longitude: inc.longitude + 0.002,
        address: `Distribution Staging Area, ${inc.address}`,
        requiredSkills: ["Water Distribution", "Food Distribution", "Logistics"],
        peopleAffected: 25,
        impactPoints: 10,
        estimatedDuration: "30 min",
        status: "AVAILABLE",
        description: `Hand out potable bottled water and dry food ration packs to stranded families awaiting road clearance.`,
        urgency: "NORMAL",
        equipmentNeeded: "Water cans / Ration transport"
      });
    }

    // 3. Ground Verification / Safety Marshalling
    if (inc.priority === 'P2' || inc.priority === 'P3' || !inc.isCorroborated) {
      generatedTasks.push({
        id: `TSK-${inc.id}-VERIFY`,
        incidentId: inc.id,
        title: `Ground Damage Verification & Road Status: ${inc.title.substring(0, 40)}`,
        category: "Damage Verification",
        priority: inc.priority || "P3",
        latitude: inc.latitude,
        longitude: inc.longitude,
        address: inc.address,
        requiredSkills: ["Damage Verification", "Crowd Management"],
        peopleAffected: 5,
        impactPoints: 8,
        estimatedDuration: "20 min",
        status: "AVAILABLE",
        description: `Check if stormwater runoff depth has receded and upload photographic verification from a safe distance.`,
        urgency: "LOW",
        equipmentNeeded: "Smartphone camera, Waterproof gear"
      });
    }
  });

  return generatedTasks;
}
