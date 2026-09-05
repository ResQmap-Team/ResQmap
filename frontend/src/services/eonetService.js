// Fetch real-time natural disaster data from NASA EONET (Earth Observatory Natural Event Tracker)

const EONET_API_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50";

export async function fetchRealTimeIncidents() {
  try {
    const response = await fetch(EONET_API_URL);
    if (!response.ok) throw new Error("NASA EONET API failed");
    
    const data = await response.json();
    
    return data.events.map(event => {
      // Find the most recent coordinate
      const latestGeo = event.geometry[event.geometry.length - 1];
      let lat, lng;
      
      if (latestGeo.type === "Point") {
        lng = latestGeo.coordinates[0];
        lat = latestGeo.coordinates[1];
      } else if (latestGeo.type === "Polygon") {
        // Just take the first point of the polygon for the marker
        lng = latestGeo.coordinates[0][0][0];
        lat = latestGeo.coordinates[0][0][1];
      }

      // Map EONET categories to ResQMap categories/priorities
      const categoryId = event.categories[0]?.id || "";
      let category = "Unknown Hazard";
      let priority = "P2";
      let severity = "MODERATE";

      if (categoryId === "wildfires") {
        category = "Wildfire";
        priority = "P0";
        severity = "CRITICAL";
      } else if (categoryId === "severeStorms") {
        category = "Severe Storm";
        priority = "P1";
        severity = "HIGH";
      } else if (categoryId === "volcanoes") {
        category = "Volcanic Eruption";
        priority = "P0";
        severity = "CRITICAL";
      } else if (categoryId === "seaLakeIce") {
        category = "Ice Hazard";
        priority = "P2";
        severity = "MODERATE";
      } else if (categoryId === "earthquakes") {
        category = "Earthquake";
        priority = "P0";
        severity = "CRITICAL";
      } else if (categoryId === "floods") {
        category = "Flooding";
        priority = "P1";
        severity = "HIGH";
      } else if (categoryId === "landslides") {
        category = "Landslide";
        priority = "P1";
        severity = "HIGH";
      }

      return {
        id: event.id,
        title: event.title,
        hazardCategory: category,
        description: `NASA EONET Alert: ${event.categories[0]?.title}. Tracking live coordinates.`,
        latitude: lat,
        longitude: lng,
        address: "Global Sensor Network",
        status: "NEW",
        timestamp: latestGeo.date,
        priority: priority,
        severity: severity,
        authenticityScore: 100, // It's from NASA
        isRealDisaster: true,
        source: "NASA_EONET",
        needsMedical: false,
        needsBoat: categoryId === "floods",
        hasElderlyOrInfants: false,
        trappedCount: 0
      };
    }).filter(inc => inc.latitude && inc.longitude); // Only return ones with valid coordinates
  } catch (error) {
    console.error("Failed to fetch real-time disaster data:", error);
    return [];
  }
}
