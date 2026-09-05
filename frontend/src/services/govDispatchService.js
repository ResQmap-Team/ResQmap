/**
 * govDispatchService.js — Emergency Report Forwarding Service
 * ============================================================
 *
 * ARCHITECTURE:
 *   Frontend  →  ResQMap FastAPI backend  →  External emergency endpoint
 *
 * The frontend NEVER contacts external emergency endpoints directly.
 * All credentials (API keys, endpoint URLs) remain server-side.
 * This service only talks to the local FastAPI backend.
 *
 * If the backend is not running, the status is FAILED — not silently
 * swallowed or simulated.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status constants — mirror backend EmergencyForwardingStatus enum exactly
// ─────────────────────────────────────────────────────────────────────────────
export const FORWARDING_STATUS = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',   // Endpoint not set in backend env
  PENDING:        'PENDING',          // Accepted, not yet sent
  SENDING:        'SENDING',          // HTTP request in progress
  SENT:           'SENT',             // External endpoint confirmed receipt (2xx)
  FAILED:         'FAILED',           // Endpoint rejected or error
  RETRY_REQUIRED: 'RETRY_REQUIRED',   // Transient failure, retry is safe
});

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint mode labels — returned by GET /api/emergency-reports/config
// ─────────────────────────────────────────────────────────────────────────────
export const ENDPOINT_MODE = Object.freeze({
  SMTP_CONFIGURED:      'SMTP_CONFIGURED',
  SMTP_OUTBOUND:        'SMTP_OUTBOUND',
  OUTBOUND_NOTIFICATION:'OUTBOUND_NOTIFICATION',
  NOT_CONFIGURED:       'NOT_CONFIGURED',
  TEST_ENDPOINT:        'TEST_ENDPOINT',
  REAL_EXTERNAL_ENDPOINT: 'REAL_EXTERNAL_ENDPOINT',
});



/**
 * Fetch the current endpoint configuration mode from the backend.
 * Returns { endpoint_mode, destination_label } — no URL or key exposed.
 * Returns null if the backend is unreachable.
 */
export async function getForwardingConfig(backendUrl = 'https://resq-gu02.onrender.com') {
  try {
    const response = await fetch(`${backendUrl}/api/emergency-reports/config`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}


/**
 * Forward an incident report to the configured emergency endpoint.
 *
 * Because ResQMap incidents currently live in localStorage/frontend memory,
 * we POST the full incident object to the backend's forward-with-data endpoint.
 * The backend validates, builds the structured report, and forwards it.
 *
 * @param {Object} incident       - The full incident object from DisasterContext
 * @param {string} backendUrl     - The ResQMap FastAPI backend URL (from Settings)
 * @param {Object} [options]      - { operatorNotes: string, isRetry: boolean }
 *
 * @returns {Promise<Object>}     - EmergencyForwardingAttempt (see models.py)
 *   {
 *     attempt_id, incident_id, destination_label, attempted_at,
 *     status (FORWARDING_STATUS), http_status_code, external_reference_id,
 *     failure_category, sanitized_error, report_id
 *   }
 *
 * IMPORTANT: Only trust status=SENT as confirmation of delivery.
 *   NOT_CONFIGURED → endpoint not set up, display configuration instructions
 *   FAILED         → show sanitized_error, no retry
 *   RETRY_REQUIRED → show sanitized_error, offer retry button
 */
export async function forwardEmergencyReport(incident, backendUrl = 'https://resq-gu02.onrender.com', options = {}) {
  const { operatorNotes = null, isRetry = false } = options;

  if (!incident) {
    return {
      status: FORWARDING_STATUS.FAILED,
      failure_category: 'CLIENT_ERROR',
      sanitized_error: 'No incident data provided.',
      attempted_at: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(`${backendUrl}/api/emergency-reports/forward-with-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        incident,
        operator_notes: operatorNotes,
        is_retry: isRetry,
      }),
      // Timeout: slightly longer than backend's own timeout to allow for backend processing
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      return await response.json();
    }

    // The backend returns a structured error — parse it
    let detail = 'Backend returned an error.';
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch { /* ignore parse error */ }

    // 422 = eligibility check failed (false alarm, etc.)
    return {
      status: response.status === 422 ? FORWARDING_STATUS.FAILED : FORWARDING_STATUS.FAILED,
      failure_category: 'HTTP_ERROR',
      sanitized_error: detail,
      http_status_code: response.status,
      attempted_at: new Date().toISOString(),
    };

  } catch (err) {
    if (err.name === 'TimeoutError') {
      return {
        status: FORWARDING_STATUS.RETRY_REQUIRED,
        failure_category: 'TIMEOUT',
        sanitized_error: 'Request to ResQMap backend timed out. Check that the backend is running.',
        attempted_at: new Date().toISOString(),
      };
    }

    // Network error — backend not running
    return {
      status: FORWARDING_STATUS.FAILED,
      failure_category: 'CONNECTION_ERROR',
      sanitized_error: `Cannot connect to ResQMap backend at ${backendUrl}. Check that the server is running.`,
      attempted_at: new Date().toISOString(),
    };
  }
}


/**
 * Retry a previous failed forwarding attempt.
 * Identical to forwardEmergencyReport but sets is_retry=true.
 */
export async function retryEmergencyReport(incident, backendUrl = 'https://resq-gu02.onrender.com', operatorNotes = null) {
  return forwardEmergencyReport(incident, backendUrl, { operatorNotes, isRetry: true });
}


/**
 * Fetch the forwarding attempt history for a specific incident from the backend.
 * Returns an array of EmergencyForwardingAttempt objects, or [] on error.
 */
export async function getForwardingHistory(incidentId, backendUrl = 'https://resq-gu02.onrender.com') {
  try {
    const response = await fetch(
      `${backendUrl}/api/emergency-reports/${encodeURIComponent(incidentId)}/history`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}
