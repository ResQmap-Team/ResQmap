/**
 * ResQNet Spatial & Temporal Corroboration & Deduplication Engine (Slide 06)
 * "Five reports. One incident."
 * Clusters multiple citizen submissions within a spatial radius (default 500m)
 * and time window into a single consolidated, corroborated incident.
 */

// Haversine distance in meters between two lat/lng coordinates
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Check if a new report matches an existing incident cluster
 */
export function findCorroboratingIncident(newReport, existingIncidents, maxRadiusMeters = 800, maxTimeHours = 3) {
  if (!newReport || !newReport.latitude || !newReport.longitude) return null;

  const newTime = new Date(newReport.createdAt || Date.now()).getTime();

  for (const existing of existingIncidents) {
    if (!existing.isRealDisaster || existing.status === 'RESOLVED') continue;

    // Check same or compatible hazard category
    const catMatch = existing.hazardCategory === newReport.hazardCategory ||
      (existing.hazardCategory.includes('Flood') && newReport.hazardCategory.includes('Flood')) ||
      (existing.hazardCategory.includes('Fire') && newReport.hazardCategory.includes('Fire')) ||
      (existing.hazardCategory.includes('Structural') && newReport.hazardCategory.includes('Structural'));

    if (!catMatch) continue;

    // Check spatial distance
    const dist = calculateDistanceMeters(
      existing.latitude, 
      existing.longitude, 
      newReport.latitude, 
      newReport.longitude
    );

    // Check time difference
    const existingTime = new Date(existing.createdAt).getTime();
    const diffHours = Math.abs(newTime - existingTime) / (1000 * 60 * 60);

    if (dist <= maxRadiusMeters && diffHours <= maxTimeHours) {
      return {
        matchedIncident: existing,
        distanceMeters: dist
      };
    }
  }

  return null;
}
