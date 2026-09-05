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

      const categoryImages = {
        wildfires: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80",
        severeStorms: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=800&q=80",
        volcanoes: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=800&q=80",
        seaLakeIce: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80",
        earthquakes: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=800&q=80",
        floods: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
        landslides: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
      };

      const eventDate = latestGeo.date ? new Date(latestGeo.date).toISOString() : new Date().toISOString();

      return {
        id: event.id,
        title: event.title,
        hazardCategory: category,
        description: `NASA EONET Alert: ${event.categories[0]?.title || 'Natural Event'}. Tracking live coordinates via Global Sensor Network.`,
        latitude: lat,
        longitude: lng,
        address: "India Regional Sensor Network",
        imageUrl: categoryImages[categoryId] || "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
        status: "NEW",
        timestamp: eventDate,
        createdAt: eventDate,
        priority: priority,
        severity: severity,
        authenticityScore: 100, // It's from NASA
        isRealDisaster: true,
        source: "NASA_EONET_INDIA",
        needsMedical: false,
        needsBoat: categoryId === "floods",
        hasElderlyOrInfants: false,
        trappedCount: 0
      };
    }).filter(inc => (
      inc.latitude && 
      inc.longitude && 
      inc.latitude >= 6.5 && 
      inc.latitude <= 37.5 && 
      inc.longitude >= 68.0 && 
      inc.longitude <= 97.5
    )); // Strictly India Geographic Coordinates
  } catch (error) {
    console.error("Failed to fetch real-time disaster data:", error);
    return [];
  }
}
