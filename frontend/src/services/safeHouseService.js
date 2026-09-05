// SafeHouse Distance & Routing Calculation Service
// Utilizes Haversine geographic formula with disaster road slowdown models

/**
 * Calculate Great-Circle Distance between two coordinates in Kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return parseFloat(d.toFixed(1));
}

/**
 * Estimate travel time in disaster conditions (traffic slowdown / waterlogged roads)
 */
export function estimateTravelTime(distanceKm, mode = 'drive') {
  if (!distanceKm || distanceKm <= 0) return { minutes: 1, text: '< 1 min' };
  
  let speedKmH = mode === 'walk' ? 4.5 : 25; // Average emergency driving speed ~25 km/h
  const minutes = Math.max(1, Math.round((distanceKm / speedKmH) * 60));
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return { minutes, text: `${hours}h ${remainingMins}m` };
  }
  return { minutes, text: `${minutes} min` };
}

/**
 * Find and rank nearest safehouses to a given coordinate
 */
export function findNearestSafeHouses(lat, lng, safeHouses = [], options = {}) {
  if (!lat || !lng || !Array.isArray(safeHouses) || safeHouses.length === 0) {
    return [];
  }

  const {
    maxDistanceKm = 500, // Search radius
    filterOpenOnly = false,
    requireMedical = false,
    requireFoodWater = false,
    requireAccessibility = false
  } = options;

  const statusPriority = {
    'OPEN': 1,
    'LIMITED': 2,
    'FULL': 3,
    'EVACUATING': 4,
    'CLOSED': 5
  };

  const enriched = safeHouses
    .map(sh => {
      const distance = calculateDistanceKm(lat, lng, sh.latitude, sh.longitude);
      const driveEta = estimateTravelTime(distance, 'drive');
      const walkEta = estimateTravelTime(distance, 'walk');
      const occupancyRate = sh.capacity > 0 ? Math.round((sh.currentOccupancy / sh.capacity) * 100) : 100;
      
      return {
        ...sh,
        distanceKm: distance,
        driveEta: driveEta.text,
        driveEtaMinutes: driveEta.minutes,
        walkEta: walkEta.text,
        occupancyRate: occupancyRate
      };
    })
    .filter(sh => {
      if (sh.distanceKm > maxDistanceKm) return false;
      if (filterOpenOnly && !['OPEN', 'LIMITED'].includes(sh.status)) return false;
      if (requireMedical && !sh.medicalSupport) return false;
      if (requireFoodWater && (!sh.foodAvailable || !sh.waterAvailable)) return false;
      if (requireAccessibility && !sh.accessibility) return false;
      return true;
    });

  // Sort by Status Priority -> Distance -> Available Beds
  enriched.sort((a, b) => {
    const statusA = statusPriority[a.status] || 99;
    const statusB = statusPriority[b.status] || 99;
    
    if (statusA !== statusB) {
      return statusA - statusB;
    }
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }
    return (b.availableBeds || 0) - (a.availableBeds || 0);
  });

  return enriched;
}

/**
 * Generate standard Google Maps directions link for safe external navigation
 */
export function getDirectionsUrl(lat, lng) {
  if (!lat || !lng) return "#";
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Backend API abstraction with graceful local fallback
 * (Pre-wired for future FastAPI endpoints: GET /api/safehouses, GET /api/safehouses/nearest)
 */
export async function fetchSafeHousesFromBackend(backendUrl, userLat, userLng) {
  if (!backendUrl) return null;
  try {
    const query = userLat && userLng ? `?lat=${userLat}&lng=${userLng}` : '';
    const res = await fetch(`${backendUrl}/api/safehouses/nearest${query}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.info("Backend safehouses endpoint not reachable, using seeded local dataset:", e);
  }
  return null;
}
