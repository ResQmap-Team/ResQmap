import exifr from 'exifr';

/**
 * Extracts GPS latitude, longitude, and creation timestamp from an image file's EXIF metadata.
 * Returns null if EXIF GPS data is missing.
 */
export async function extractPhotoMetadata(file) {
  try {
    if (!file) return null;

    const data = await exifr.parse(file, {
      gps: true,
      pick: ['GPSLatitude', 'GPSLongitude', 'DateTimeOriginal', 'Make', 'Model']
    });

    if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return {
        latitude: parseFloat(data.latitude.toFixed(6)),
        longitude: parseFloat(data.longitude.toFixed(6)),
        timestamp: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : null,
        device: data.Make && data.Model ? `${data.Make} ${data.Model}` : (data.Model || 'Mobile Camera'),
        hasGps: true
      };
    }

    // Attempt fallback parsing for raw GPSLatitude/GPSLongitude
    if (data && data.GPSLatitude && data.GPSLongitude) {
      return {
        latitude: parseFloat(data.GPSLatitude.toFixed(6)),
        longitude: parseFloat(data.GPSLongitude.toFixed(6)),
        timestamp: data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : null,
        device: data.Make && data.Model ? `${data.Make} ${data.Model}` : 'Mobile Camera',
        hasGps: true
      };
    }

    return { hasGps: false };
  } catch (err) {
    console.warn("EXIF extraction error:", err);
    return { hasGps: false };
  }
}

/**
 * Converts a file to base64 data URL.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
