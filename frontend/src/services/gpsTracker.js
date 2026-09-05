/**
 * ResQMap AI — Real GPS Tracker Service
 *
 * Uses navigator.geolocation.watchPosition() for real device GPS.
 * No simulated movement. No fake coordinates.
 *
 * Usage:
 *   import gpsTracker from './gpsTracker';
 *   const stopFn = gpsTracker.start(responderId, onPosition, onError);
 *   // later:
 *   stopFn();  // calls clearWatch() internally
 */

import { apiClient } from './api';

// Minimum interval between location PATCH calls (milliseconds)
const THROTTLE_MS = 4000;

class GPSTracker {
  constructor() {
    this._watchId    = null;   // from navigator.geolocation.watchPosition
    this._lastSentAt = 0;      // epoch ms of last successful PATCH
    this._responderId = null;
  }

  /**
   * Start watching the device's real GPS position.
   *
   * @param {string}   responderId  — DB id of the logged-in responder
   * @param {function} onPosition   — called with { latitude, longitude, accuracy, heading, speed, timestamp }
   * @param {function} onError      — called with a string error message
   * @returns {function}            — cleanup function (calls clearWatch)
   */
  start(responderId, onPosition, onError) {
    if (!navigator.geolocation) {
      onError('GPS_NOT_SUPPORTED');
      return () => {};
    }

    this._responderId = responderId;

    const options = {
      enableHighAccuracy: true,
      timeout:            15000,   // 15 s before error
      maximumAge:         0,       // always request fresh position
    };

    this._watchId = navigator.geolocation.watchPosition(
      (pos) => this._handlePosition(pos, onPosition),
      (err) => this._handleError(err, onError),
      options,
    );

    console.info(`[GPS] watchPosition started — watchId=${this._watchId}, responderId=${responderId}`);

    // Return cleanup function
    return () => this.stop();
  }

  stop() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      console.info(`[GPS] clearWatch(${this._watchId}) called`);
      this._watchId    = null;
      this._responderId = null;
      this._lastSentAt  = 0;
    }
  }

  _handlePosition(pos, onPosition) {
    const { latitude, longitude, accuracy, heading, speed } = pos.coords;
    const timestamp = new Date(pos.timestamp).toISOString();

    const location = { latitude, longitude, accuracy, heading, speed, timestamp };

    // Always notify the UI immediately
    onPosition(location);

    // Throttle backend PATCH calls
    const now = Date.now();
    if (now - this._lastSentAt < THROTTLE_MS) return;
    this._lastSentAt = now;

    if (!this._responderId) return;

    // PATCH /api/responders/{id}/location — fire and forget
    apiClient.updateResponderLocation(this._responderId, {
      latitude,
      longitude,
      accuracy:  accuracy  ?? null,
      heading:   heading   ?? null,
      speed:     speed     ?? null,
    }).then(() => {
      console.debug(`[GPS] Location persisted → (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) ±${accuracy?.toFixed(0)}m`);
    }).catch((err) => {
      console.warn('[GPS] Failed to persist location:', err);
    });
  }

  _handleError(err, onError) {
    const msgs = {
      1: 'PERMISSION_DENIED',
      2: 'POSITION_UNAVAILABLE',
      3: 'TIMEOUT',
    };
    const code = msgs[err.code] || 'UNKNOWN_ERROR';
    console.warn(`[GPS] watchPosition error: ${code} — ${err.message}`);
    onError(code);
  }

  isTracking() {
    return this._watchId !== null;
  }
}

// Singleton
export const gpsTracker = new GPSTracker();
export default gpsTracker;
