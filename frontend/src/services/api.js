/**
 * ResQMap AI — Central Frontend API Client
 *
 * Features:
 *  - Single source of truth for all backend fetch() calls
 *  - Physical-system failover: health-checks configured peer nodes in order,
 *    switches automatically when the active host becomes unreachable
 *  - WebSocket lifecycle management with automatic reconnect
 *  - localStorage cache fallback when backend is unreachable
 *  - Consistent error handling and JSON parsing
 */

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Ordered list of backend hosts (teammate physical machines).
 * The first reachable host becomes the active API base.
 *
 * Populated from VITE_API_NODES env var (comma-separated URLs).
 * Falls back to VITE_API_URL, then localhost.
 *
 * Override at runtime: apiClient.setNodes(['http://192.168.1.10:8000', ...])
 */
const DEFAULT_CLOUD_BACKEND = 'https://resq-gu02.onrender.com';

const _defaultNodes = (() => {
  const nodesEnv = import.meta.env.VITE_API_NODES || '';
  if (nodesEnv.trim()) {
    return nodesEnv.split(',').map(u => u.trim()).filter(Boolean);
  }
  const stored = localStorage.getItem('RESQMAP_BACKEND_URL');
  if (stored && stored.trim() && stored !== 'http://localhost:8000') {
    return [stored.trim(), DEFAULT_CLOUD_BACKEND, 'http://localhost:8000'];
  }
  const single = import.meta.env.VITE_API_URL || DEFAULT_CLOUD_BACKEND;
  return [single, 'http://localhost:8000'];
})();

const HEALTH_CHECK_INTERVAL_MS = 15_000;  // 15 s
const REQUEST_TIMEOUT_MS       = 10_000;  // 10 s
const HEALTH_CHECK_TIMEOUT_MS  = 3_000;   // 3 s per node during health check

// ─── API Client ───────────────────────────────────────────────────────────────

class ResQMapAPIClient {
  constructor() {
    this._nodes            = [..._defaultNodes];
    this._activeIndex      = 0;
    this._ws               = null;
    this._wsListeners      = new Map();   // eventType → Set<handler>
    this._wsReconnectTimer = null;
    this._healthTimer      = null;
    this._online           = false;       // true when connected to a working node
    this._statusListeners  = new Set();

    // Per-node health data: url → { data, reachable, checkedAt } | null
    this._nodeHealthMap    = new Map();
    // Initialize all nodes as unknown
    this._nodes.forEach(url => this._nodeHealthMap.set(url, null));

    /**
     * Real WebSocket connection state string.
     * Possible values: 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'UNKNOWN'
     * Updated by _connectWS lifecycle handlers. Never faked.
     */
    this._wsState = 'UNKNOWN';

    /**
     * The most recent actual failover transition, if one has occurred.
     * null until an actual node switch happens.
     * Shape: { fromUrl, fromIndex, toUrl, toIndex, occurredAt }
     */
    this._lastFailoverEvent = null;

    // Start periodic health-check
    this._startHealthLoop();
  }

  // ─── Node management ──────────────────────────────────────────────────────

  get activeUrl() {
    return this._nodes[this._activeIndex] || 'http://localhost:8000';
  }

  get wsUrl() {
    const base = this.activeUrl.replace(/^http/, 'ws');
    return `${base}/ws`;
  }

  setNodes(nodes) {
    const filtered = nodes.filter(Boolean);
    this._nodes = filtered;
    this._activeIndex = 0;
    // Reset health map for new node list
    this._nodeHealthMap = new Map();
    filtered.forEach(url => this._nodeHealthMap.set(url, null));
    this._runHealthCheck();
  }

  addNode(url) {
    if (url && !this._nodes.includes(url)) {
      this._nodes.push(url);
      this._nodeHealthMap.set(url, null);
    }
  }

  getNodes() {
    return [...this._nodes];
  }

  // ─── Per-node health state ────────────────────────────────────────────────

  /**
   * Returns the current known health status for all configured nodes.
   * Each entry: { url, reachable, data, checkedAt } or { url, reachable: false, data: null, checkedAt }
   */
  getNodeStatuses() {
    return this._nodes.map((url, index) => {
      const entry = this._nodeHealthMap.get(url);
      return {
        url,
        index,
        isActive: index === this._activeIndex && this._online,
        reachable: entry?.reachable ?? false,
        data: entry?.data ?? null,
        checkedAt: entry?.checkedAt ?? null,
      };
    });
  }

  /**
   * Force a fresh health check on ALL nodes (not just until a working one is found)
   * and return the full results. Used by UI to refresh the resilience panel.
   */
  async getAllNodesHealth() {
    const results = await Promise.all(
      this._nodes.map(async (url) => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), HEALTH_CHECK_TIMEOUT_MS);
          const resp = await fetch(`${url}/api/health`, { signal: ctrl.signal });
          clearTimeout(timer);
          if (resp.ok) {
            const data = await resp.json();
            const entry = { reachable: true, data, checkedAt: new Date().toISOString() };
            this._nodeHealthMap.set(url, entry);
            return { url, ...entry };
          }
          const entry = { reachable: false, data: null, checkedAt: new Date().toISOString() };
          this._nodeHealthMap.set(url, entry);
          return { url, ...entry };
        } catch {
          const entry = { reachable: false, data: null, checkedAt: new Date().toISOString() };
          this._nodeHealthMap.set(url, entry);
          return { url, ...entry };
        }
      })
    );
    // Re-run normal failover to update active index
    await this._runHealthCheck();
    return results;
  }

  // ─── Status notifications ─────────────────────────────────────────────────

  onStatusChange(fn) {
    this._statusListeners.add(fn);
    return () => this._statusListeners.delete(fn);
  }

  _emitStatus() {
    const info = {
      activeUrl:         this.activeUrl,
      online:            this._online,
      activeIndex:       this._activeIndex,
      nodes:             this._nodes,
      nodeStatuses:      this.getNodeStatuses(),
      wsState:           this._wsState,
      lastFailoverEvent: this._lastFailoverEvent,
    };
    this._statusListeners.forEach(fn => fn(info));
  }

  // ─── Health-check loop ────────────────────────────────────────────────────

  _startHealthLoop() {
    this._runHealthCheck();
    this._healthTimer = setInterval(() => this._runHealthCheck(), HEALTH_CHECK_INTERVAL_MS);
  }

  async _runHealthCheck() {
    for (let i = 0; i < this._nodes.length; i++) {
      const url = this._nodes[i];
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), HEALTH_CHECK_TIMEOUT_MS);
        const resp = await fetch(`${url}/api/health`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (resp.ok) {
          // Store health data for this node
          const data = await resp.json().catch(() => null);
          this._nodeHealthMap.set(url, {
            reachable: true,
            data,
            checkedAt: new Date().toISOString(),
          });

          const wasOnline = this._online;
          const prevIndex = this._activeIndex;
          this._online      = true;
          this._activeIndex = i;

          if (!wasOnline || prevIndex !== i) {
            // Record actual failover event only when switching to a DIFFERENT node
            if (wasOnline && prevIndex !== i) {
              this._lastFailoverEvent = {
                fromUrl:    this._nodes[prevIndex] || null,
                fromIndex:  prevIndex,
                toUrl:      url,
                toIndex:    i,
                occurredAt: new Date().toISOString(),
              };
              console.info(`[API] FAILOVER: node ${prevIndex} → node ${i} (${url})`);
            } else {
              console.info(`[API] Active backend: ${url} (node ${i})`);
            }
            this._emitStatus();
            // Reconnect WebSocket to new active host
            this._connectWS();
          } else {
            // Still same node — emit status so UI can refresh health timestamps
            this._emitStatus();
          }
          return;   // found a working node — stop here for failover logic
        } else {
          this._nodeHealthMap.set(url, {
            reachable: false,
            data: null,
            checkedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Node unreachable — record it and try next
        this._nodeHealthMap.set(url, {
          reachable: false,
          data: null,
          checkedAt: new Date().toISOString(),
        });
      }
    }

    // All nodes unreachable
    if (this._online) {
      console.warn('[API] All backend nodes unreachable — going offline');
      this._online = false;
      this._emitStatus();
    } else {
      // Still offline but emit so UI timestamps update
      this._emitStatus();
    }
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  async _fetch(path, options = {}) {
    const url = `${this.activeUrl}${path}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

    try {
      const resp = await fetch(url, {
        ...options,
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${body || resp.statusText}`);
      }

      // 204 No Content
      if (resp.status === 204) return null;
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }

  get  = (path)           => this._fetch(path);
  post = (path, body)     => this._fetch(path, { method: 'POST',  body: JSON.stringify(body) });
  patch = (path, body)    => this._fetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  del  = (path)           => this._fetch(path, { method: 'DELETE' });

  // ─── WebSocket ────────────────────────────────────────────────────────────

  _connectWS() {
    if (this._ws) {
      try { this._ws.close(); } catch (e) {}
      this._ws = null;
    }
    clearTimeout(this._wsReconnectTimer);

    if (!this._online) {
      if (this._wsState !== 'DISCONNECTED') {
        this._wsState = 'DISCONNECTED';
        this._emitStatus();
      }
      return;
    }

    this._wsState = 'CONNECTING';
    this._emitStatus();

    try {
      const ws = new WebSocket(this.wsUrl);
      this._ws = ws;

      ws.onopen = () => {
        this._wsState = 'CONNECTED';
        this._emitStatus();
        console.info(`[WS] Connected to ${this.wsUrl}`);
        // Send periodic pings to keep alive
        ws._pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 25_000);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const handlers = this._wsListeners.get(msg.type);
          if (handlers) handlers.forEach(h => h(msg));
          // Also fire '*' handlers
          const all = this._wsListeners.get('*');
          if (all) all.forEach(h => h(msg));
        } catch (e) {}
      };

      ws.onclose = () => {
        clearInterval(ws._pingInterval);
        // Only RECONNECTING if we still expect a connection; DISCONNECTED if offline
        this._wsState = this._online ? 'RECONNECTING' : 'DISCONNECTED';
        this._emitStatus();
        console.warn('[WS] Disconnected — reconnecting in 3 s');
        this._wsReconnectTimer = setTimeout(() => this._connectWS(), 3000);
      };

      ws.onerror = () => {
        // onclose will fire after onerror; state update handled there
      };
    } catch (e) {
      this._wsState = 'RECONNECTING';
      this._emitStatus();
      console.warn('[WS] Could not connect:', e);
      this._wsReconnectTimer = setTimeout(() => this._connectWS(), 5000);
    }
  }

  /**
   * Subscribe to WebSocket events.
   * @param {string} eventType  — e.g. 'INCIDENT_CREATED', '*' for all
   * @param {function} handler  — receives the parsed message object
   * @returns {function}        — call to unsubscribe
   */
  on(eventType, handler) {
    if (!this._wsListeners.has(eventType)) {
      this._wsListeners.set(eventType, new Set());
    }
    this._wsListeners.get(eventType).add(handler);
    return () => {
      const set = this._wsListeners.get(eventType);
      if (set) set.delete(handler);
    };
  }

  /**
   * Send a JSON payload over the active WebSocket.
   */
  sendWS(msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      try {
        this._ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // ─── Incident API ─────────────────────────────────────────────────────────

  async getIncidents(limit = 100) {
    return this.get(`/api/incidents?limit=${limit}`);
  }

  async createIncident(payload) {
    return this.post('/api/incidents', payload);
  }

  async getIncident(id) {
    return this.get(`/api/incidents/${id}`);
  }

  async updateIncidentStatus(id, statusData) {
    return this.patch(`/api/incidents/${id}/status`, statusData);
  }

  async dispatchIncident(id, dispatchData) {
    return this.patch(`/api/incidents/${id}/dispatch`, dispatchData);
  }

  // ─── AI Classification ────────────────────────────────────────────────────

  async classifyLive(imageBase64OrUrl, apiKey = null) {
    const body = apiKey ? { api_key: apiKey } : {};
    if (imageBase64OrUrl.startsWith('http')) {
      body.image_url = imageBase64OrUrl;
    } else {
      body.image_base64 = imageBase64OrUrl;
    }
    return this.post('/api/classify-live', body);
  }

  // ─── SOS API ──────────────────────────────────────────────────────────────

  async createSOS(sosData) {
    return this.post('/api/sos', sosData);
  }

  async getSOSQueue(statusFilter = 'ACTIVE') {
    return this.get(`/api/sos/queue?status_filter=${statusFilter}`);
  }

  async overrideSOSPriority(sosId, level, overrideBy, reason) {
    return this.patch(`/api/sos/${sosId}/priority`, {
      priority_level: level,
      override_by: overrideBy,
      reason,
    });
  }

  async updateSOSStatus(sosId, statusData) {
    return this.patch(`/api/sos/${sosId}/status`, statusData);
  }

  // ─── Responder API ────────────────────────────────────────────────────────

  async getResponders() {
    return this.get('/api/responders');
  }

  async registerResponder(data) {
    return this.post('/api/responders', data);
  }

  async updateResponderLocation(responderId, locationData) {
    return this.patch(`/api/responders/${responderId}/location`, locationData);
  }

  async getResponderMissions(responderId) {
    return this.get(`/api/responders/${responderId}/missions`);
  }

  async createMission(responderId, missionData) {
    return this.post(`/api/responders/${responderId}/missions`, missionData);
  }

  async updateMissionStatus(missionId, newStatus) {
    return this.patch(`/api/missions/${missionId}/status`, { status: newStatus });
  }

  async getNearbyResponders(lat, lon, skills = []) {
    const skillParam = skills.length ? `&skills=${skills.join(',')}` : '';
    return this.get(`/api/responders/nearby?lat=${lat}&lon=${lon}${skillParam}`);
  }

  async getVolunteerAnalysis() {
    return this.get('/api/volunteers/analysis');
  }

  async matchVolunteers(matchPayload) {
    return this.post('/api/volunteers/match', matchPayload);
  }

  async getAllMissions(limit = 50) {
    return this.get(`/api/missions?limit=${limit}`);
  }

  // ─── Emergency Report Forwarding API ───────────────────────────────────────

  async getForwardingConfig() {
    return this.get('/api/emergency-reports/config');
  }

  async forwardEmergencyReport(incident, options = {}) {
    return this.post('/api/emergency-reports/forward-with-data', {
      incident,
      operator_notes: options.operatorNotes || null,
      is_retry: options.isRetry || false,
    });
  }

  async getIncidentForwardingHistory(incidentId) {
    return this.get(`/api/emergency-reports/${encodeURIComponent(incidentId)}/history`);
  }

  async getAllForwardingHistory() {
    return this.get('/api/emergency-reports/history/all');
  }

  async getTestReceiverLogs() {
    return this.get('/api/dev/test-receiver/logs');
  }

  async clearTestReceiverLogs() {
    return this.del('/api/dev/test-receiver/logs');
  }



  // ─── Live Feed API ────────────────────────────────────────────────────────

  async getFeeds() {
    return this.get('/api/feeds');
  }

  async registerFeed(feedData) {
    return this.post('/api/feeds', feedData);
  }

  async updateFeed(feedId, feedData) {
    return this.patch(`/api/feeds/${feedId}`, feedData);
  }

  // ─── ICE Servers ──────────────────────────────────────────────────────────

  async getICEServers() {
    try {
      const data = await this.get('/api/ice-servers');
      return data.iceServers;
    } catch (e) {
      // Fallback to public STUN only
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ];
    }
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  async checkHealth() {
    return this.get('/api/health');
  }

  getConnectionInfo() {
    return {
      activeUrl:         this.activeUrl,
      online:            this._online,
      nodes:             this._nodes,
      activeIndex:       this._activeIndex,
      nodeStatuses:      this.getNodeStatuses(),
      wsState:           this._wsState,
      lastFailoverEvent: this._lastFailoverEvent,
    };
  }
}

// Singleton exported for use across the app
export const apiClient = new ResQMapAPIClient();
export default apiClient;
