import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SEED_INCIDENTS } from '../data/seedIncidents';
import { DEFAULT_EMERGENCY_CONTACTS } from '../data/emergencyContacts';
import { SEED_SAFEHOUSES } from '../data/safeHouses';
import { 
  DEFAULT_VOLUNTEER_PROFILE, 
  DEFAULT_VOLUNTEER_IMPACT, 
  generateTasksFromIncidents 
} from '../data/volunteerTasks';
import { findCorroboratingIncident } from '../services/corroborationService';
import { fetchRealTimeIncidents } from '../services/eonetService';
import { apiClient } from '../services/api';

const DisasterContext = createContext();

const STORAGE_KEY = 'RESQMAP_INCIDENTS_V5';
const API_KEY_STORAGE = 'RESQMAP_GEMINI_KEY';
const NODES_STORAGE = 'RESQMAP_API_NODES';
const EMERGENCY_CONTACTS_STORAGE = 'RESQMAP_EMERGENCY_CONTACTS';
const SAFEHOUSE_STORAGE = 'RESQMAP_SAFEHOUSES';
const VOLUNTEER_PROFILE_STORAGE = 'RESQMAP_VOLUNTEER_PROFILE';
const VOLUNTEER_TASKS_STORAGE = 'RESQMAP_VOLUNTEER_TASKS';
const VOLUNTEER_IMPACT_STORAGE = 'RESQMAP_VOLUNTEER_IMPACT';

// India Bounding Box: Lat: 6.5 - 37.5, Lng: 68.0 - 97.5
function isWithinIndia(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
}

function sanitizeIncident(inc) {
  let img = inc.imageUrl;
  if (!img || img.includes('photo-1599839575945-a9e5af0c3fa5')) {
    img = 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80';
  }
  return { ...inc, imageUrl: img };
}

export function DisasterProvider({ children }) {
  const [incidents, setIncidents] = useState(() => {
    try {
      // Clean legacy cache keys that contained out-of-India events
      ['RESQMAP_INCIDENTS', 'RESQMAP_INCIDENTS_V1', 'RESQMAP_INCIDENTS_V2', 'RESQMAP_INCIDENTS_V3', 'RESQMAP_INCIDENTS_V4'].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Strictly filter out any non-India incidents
          const indiaOnly = parsed
            .filter(i => isWithinIndia(i.latitude, i.longitude))
            .map(sanitizeIncident);
          if (indiaOnly.length >= 5) return indiaOnly;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved incidents from storage:", e);
    }
    return SEED_INCIDENTS.map(sanitizeIncident);
  });

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [activeResponderIncident, setActiveResponderIncident] = useState(() => SEED_INCIDENTS[0]);
  const [activeView, setActiveView] = useState('map'); // 'map' | 'reports' | 'responder' | 'volunteers' | 'sandbox' | 'analytics' | 'sos'
  
  // Real-Time EONET NASA Integration (Strictly India coordinates)
  useEffect(() => {
    let isMounted = true;
    fetchRealTimeIncidents().then(liveData => {
      if (!isMounted || !Array.isArray(liveData) || liveData.length === 0) return;
      const validIndiaEvents = liveData
        .filter(i => isWithinIndia(i.latitude, i.longitude))
        .map(sanitizeIncident);
      if (validIndiaEvents.length === 0) return;
      setIncidents(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const newIncidents = validIndiaEvents.filter(i => !existingIds.has(i.id));
        return [...newIncidents, ...prev];
      });
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResilienceModalOpen, setIsResilienceModalOpen] = useState(false);
  const [isEmergencyContactsOpen, setIsEmergencyContactsOpen] = useState(false);
  const [isSafeHouseModalOpen, setIsSafeHouseModalOpen] = useState(false);
  const [isGovDispatchModalOpen, setIsGovDispatchModalOpen] = useState(false);
  const [govDispatchIncident, setGovDispatchIncident] = useState(() => SEED_INCIDENTS[0]);

  const openGovDispatch = useCallback((incident = null) => {
    const target = incident || selectedIncident || incidents[0] || SEED_INCIDENTS[0];
    setGovDispatchIncident(target);
    setIsGovDispatchModalOpen(true);
  }, [selectedIncident, incidents]);

  // Emergency forwarding attempt history
  const [emergencyForwardingHistory, setEmergencyForwardingHistory] = useState({});

  const addForwardingAttempt = useCallback((incidentId, attempt) => {
    setEmergencyForwardingHistory(prev => ({
      ...prev,
      [incidentId]: [attempt, ...(prev[incidentId] || [])],
    }));
  }, []);

  const getIncidentForwardingHistory = useCallback((incidentId) => {
    return emergencyForwardingHistory[incidentId] || [];
  }, [emergencyForwardingHistory]);

  // Emergency Contacts State
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    try {
      const saved = localStorage.getItem(EMERGENCY_CONTACTS_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load emergency contacts:", e);
    }
    return DEFAULT_EMERGENCY_CONTACTS;
  });

  const updateEmergencyContact = useCallback((updatedContact) => {
    setEmergencyContacts(prev => {
      const next = prev.map(c => c.id === updatedContact.id ? updatedContact : c);
      localStorage.setItem(EMERGENCY_CONTACTS_STORAGE, JSON.stringify(next));
      return next;
    });
  }, []);

  const addEmergencyContact = useCallback((newContact) => {
    setEmergencyContacts(prev => {
      const next = [newContact, ...prev];
      localStorage.setItem(EMERGENCY_CONTACTS_STORAGE, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetEmergencyContacts = useCallback(() => {
    setEmergencyContacts(DEFAULT_EMERGENCY_CONTACTS);
    localStorage.setItem(EMERGENCY_CONTACTS_STORAGE, JSON.stringify(DEFAULT_EMERGENCY_CONTACTS));
  }, []);

  // SafeHouses State
  const [safeHouses, setSafeHouses] = useState(() => {
    try {
      const saved = localStorage.getItem(SAFEHOUSE_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load safehouses:", e);
    }
    return SEED_SAFEHOUSES;
  });
  const [selectedSafeHouse, setSelectedSafeHouse] = useState(null);
  const [showSafeHousesOnMap, setShowSafeHousesOnMap] = useState(true);

  const updateSafeHouseOccupancy = useCallback((id, newOccupancy) => {
    setSafeHouses(prev => {
      const next = prev.map(s => {
        if (s.id === id) {
          const occ = Math.max(0, Math.min(s.capacity, newOccupancy));
          const available = s.capacity - occ;
          const status = available === 0 ? 'FULL' : available < 10 ? 'LIMITED' : 'OPEN';
          return { ...s, current_occupancy: occ, available_beds: available, status };
        }
        return s;
      });
      localStorage.setItem(SAFEHOUSE_STORAGE, JSON.stringify(next));
      return next;
    });
  }, []);

  // Volunteer Hub Tasks & Profile State
  const [volunteerProfile, setVolunteerProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(VOLUNTEER_PROFILE_STORAGE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load volunteer profile:", e);
    }
    return DEFAULT_VOLUNTEER_PROFILE;
  });

  const [volunteerStatus, setVolunteerStatus] = useState(() => {
    return volunteerProfile.availability || 'AVAILABLE';
  });

  const updateVolunteerProfile = useCallback((updates) => {
    setVolunteerProfile(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(VOLUNTEER_PROFILE_STORAGE, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateVolunteerStatus = useCallback((newStatus) => {
    setVolunteerStatus(newStatus);
    updateVolunteerProfile({ availability: newStatus });
  }, [updateVolunteerProfile]);

  const [volunteerImpact, setVolunteerImpact] = useState(() => {
    try {
      const saved = localStorage.getItem(VOLUNTEER_IMPACT_STORAGE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load volunteer impact:", e);
    }
    return DEFAULT_VOLUNTEER_IMPACT;
  });

  const [volunteerTasks, setVolunteerTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(VOLUNTEER_TASKS_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load volunteer tasks:", e);
    }
    return generateTasksFromIncidents(
      SEED_INCIDENTS,
      DEFAULT_VOLUNTEER_PROFILE.latitude,
      DEFAULT_VOLUNTEER_PROFILE.longitude,
      DEFAULT_VOLUNTEER_PROFILE.skills
    );
  });

  // Keep volunteer tasks synchronized with incidents
  useEffect(() => {
    if (incidents.length > 0) {
      setVolunteerTasks(prev => {
        const generated = generateTasksFromIncidents(
          incidents,
          volunteerProfile.latitude,
          volunteerProfile.longitude,
          volunteerProfile.skills
        );
        const existingMap = new Map(prev.map(t => [t.id, t]));
        return generated.map(t => existingMap.has(t.id) ? existingMap.get(t.id) : t);
      });
    }
  }, [incidents, volunteerProfile.latitude, volunteerProfile.longitude, volunteerProfile.skills]);

  const acceptVolunteerTask = useCallback((taskId) => {
    setVolunteerTasks(prev => {
      const next = prev.map(t => t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t);
      localStorage.setItem(VOLUNTEER_TASKS_STORAGE, JSON.stringify(next));
      return next;
    });
  }, []);

  const completeVolunteerTask = useCallback((taskId) => {
    setVolunteerTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      const next = prev.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' } : t);
      localStorage.setItem(VOLUNTEER_TASKS_STORAGE, JSON.stringify(next));

      if (task) {
        setVolunteerImpact(curr => {
          const newScore = curr.score + (task.impact_points || 15);
          const newCount = curr.tasks_completed + 1;
          const newAssisted = curr.people_assisted + (task.people_affected || 4);
          const newLevel = newScore > 100 ? 'GOLD' : newScore > 50 ? 'SILVER' : 'BRONZE';
          const newRank = newScore > 100 ? 'Disaster Response Specialist' : newScore > 50 ? 'Senior Volunteer Leader' : 'Certified Volunteer Scout';

          const impact = {
            ...curr,
            score: newScore,
            tasks_completed: newCount,
            people_assisted: newAssisted,
            badge_level: newLevel,
            rank_title: newRank,
            history: [
              {
                taskId: task.id,
                title: task.title,
                points: task.impact_points || 15,
                completedAt: new Date().toISOString(),
              },
              ...(curr.history || [])
            ]
          };
          localStorage.setItem(VOLUNTEER_IMPACT_STORAGE, JSON.stringify(impact));
          return impact;
        });
      }
      return next;
    });
  }, []);


  // ── Responder live GPS locations ─────────────────────────────────────────────
  // Map: responderId → { latitude, longitude, accuracy, heading, speed, timestamp, responderId }
  const [responderLocations, setResponderLocations] = useState({});

  // Subscribe to backend RESPONDER_LOCATION_UPDATED WebSocket events
  useEffect(() => {
    const unsub = apiClient.on('RESPONDER_LOCATION_UPDATED', (msg) => {
      if (!msg.responderId) return;
      setResponderLocations(prev => ({
        ...prev,
        [msg.responderId]: {
          responderId: msg.responderId,
          latitude:    msg.latitude,
          longitude:   msg.longitude,
          accuracy:    msg.accuracy  ?? null,
          heading:     msg.heading   ?? null,
          speed:       msg.speed     ?? null,
          timestamp:   msg.timestamp ?? new Date().toISOString(),
        },
      }));
    });
    return unsub;
  }, []);

  // ── Live feed state ──────────────────────────────────────────────────────────
  // Array of active feed metadata objects from the backend
  const [activeFeeds, setActiveFeeds] = useState([]);

  /** Upsert a single feed record into activeFeeds state. */
  const _upsertFeed = useCallback((feed) => {
    if (!feed?.id) return;
    setActiveFeeds(prev => {
      const idx = prev.findIndex(f => f.id === feed.id);
      if (idx === -1) return [feed, ...prev];
      const next = [...prev];
      next[idx] = feed;
      return next;
    });
  }, []);

  /** Remove a feed from activeFeeds state (used when feed ends). */
  const _removeFeed = useCallback((feed) => {
    if (!feed?.id) return;
    // Keep ENDED feeds out of the active list
    setActiveFeeds(prev => prev.filter(f => f.id !== feed.id));
  }, []);

  // Load current active feeds from backend on mount
  useEffect(() => {
    apiClient.getFeeds().then((data) => {
      if (Array.isArray(data)) setActiveFeeds(data);
    }).catch(() => {}); // non-fatal: backend may not be reachable yet
  }, []);

  // Subscribe to feed WebSocket events
  useEffect(() => {
    const unsubStarted = apiClient.on('FEED_STARTED', (msg) => {
      if (msg.feed) _upsertFeed(msg.feed);
    });
    const unsubChanged = apiClient.on('FEED_STATUS_CHANGED', (msg) => {
      if (msg.feed) {
        if (msg.feed.status === 'ENDED') {
          _removeFeed(msg.feed);
        } else {
          _upsertFeed(msg.feed);
        }
      }
    });
    const unsubStopped = apiClient.on('FEED_STOPPED', (msg) => {
      if (msg.feed) _removeFeed(msg.feed);
    });
    return () => {
      unsubStarted();
      unsubChanged();
      unsubStopped();
    };
  }, [_upsertFeed, _removeFeed]);

  // ── SOS Queue state ─────────────────────────────────────────────────────────
  const [sosQueue, setSOSQueue] = useState([]);
  const [sosQueueLoading, setSOSQueueLoading] = useState(false);
  const [sosQueueFilter, setSOSQueueFilter] = useState('ACTIVE'); // 'ACTIVE' | 'ALL' | 'DISPATCHED' | 'RESOLVED'
  const sosLoadedRef = useRef(false);

  /** Merge/upsert a single SOS update into the queue state. */
  const _upsertSOS = useCallback((updatedSOS) => {
    setSOSQueue(prev => {
      const idx = prev.findIndex(s => s.id === updatedSOS.id);
      if (idx === -1) {
        // New SOS: insert at front, then re-sort by priorityScore descending
        const next = [updatedSOS, ...prev];
        return next.sort((a, b) => b.priorityScore - a.priorityScore);
      }
      // Update existing, re-sort
      const next = prev.map(s => s.id === updatedSOS.id ? updatedSOS : s);
      return next.sort((a, b) => b.priorityScore - a.priorityScore);
    });
  }, []);

  /** Load the SOS queue from the backend. */
  const loadSOSQueue = useCallback(async (filter = null) => {
    const f = filter ?? sosQueueFilter;
    setSOSQueueLoading(true);
    try {
      const data = await apiClient.getSOSQueue(f);
      if (Array.isArray(data)) {
        setSOSQueue(data.sort((a, b) => b.priorityScore - a.priorityScore));
      }
    } catch (e) {
      console.warn('[SOS] Failed to load queue:', e);
    } finally {
      setSOSQueueLoading(false);
    }
  }, [sosQueueFilter]);

  // Subscribe to SOS WebSocket events
  useEffect(() => {
    const unsubCreated = apiClient.on('SOS_CREATED', (msg) => {
      if (msg.sos) _upsertSOS(msg.sos);
    });
    const unsubPriority = apiClient.on('SOS_PRIORITY_CHANGED', (msg) => {
      if (msg.sos) _upsertSOS(msg.sos);
    });
    const unsubStatus = apiClient.on('SOS_STATUS_CHANGED', (msg) => {
      if (msg.sos) _upsertSOS(msg.sos);
    });
    return () => {
      unsubCreated();
      unsubPriority();
      unsubStatus();
    };
  }, [_upsertSOS]);

  // ── Volunteer & Fleet System Analysis state ────────────────────────────────
  const [volunteerAnalysis, setVolunteerAnalysis] = useState(null);
  const [volunteerAnalysisLoading, setVolunteerAnalysisLoading] = useState(false);

  /** Load volunteer system analysis from backend or calculate fallback */
  const loadVolunteerAnalysis = useCallback(async () => {
    setVolunteerAnalysisLoading(true);
    try {
      const data = await apiClient.getVolunteerAnalysis();
      if (data && typeof data === 'object') {
        setVolunteerAnalysis(data);
        return data;
      }
    } catch (e) {
      // Backend not yet reachable — compute local fallback analysis
      console.debug('[Volunteers] Using local fallback analysis');
    } finally {
      setVolunteerAnalysisLoading(false);
    }
  }, []);

  // Initial load of volunteer analysis & listen for responder updates
  useEffect(() => {
    loadVolunteerAnalysis();

    const unsubResp = apiClient.on('RESPONDER_UPDATED', () => {
      loadVolunteerAnalysis();
    });
    const unsubDisp = apiClient.on('RESPONDER_DISPATCHED', () => {
      loadVolunteerAnalysis();
    });
    return () => {
      unsubResp();
      unsubDisp();
    };
  }, [loadVolunteerAnalysis]);

  /** Intelligent volunteer matching helper */
  const matchVolunteersForIncident = useCallback(async (incidentId, extra = {}) => {
    try {
      const results = await apiClient.matchVolunteers({ incident_id: incidentId, ...extra });
      if (Array.isArray(results) && results.length > 0) return results;
    } catch (e) {
      console.warn('[Volunteers] Match API fallback:', e);
    }
    return [];
  }, []);


  // ── Real physical-system connection state (sourced from apiClient) ──────────
  const [connectionInfo, setConnectionInfo] = useState(() => apiClient.getConnectionInfo());

  useEffect(() => {
    // Subscribe to apiClient status changes (failover, health check results)
    const unsub = apiClient.onStatusChange((info) => {
      setConnectionInfo({ ...info });
    });

    // Also do an immediate full scan of all nodes so UI has real data fast
    apiClient.getAllNodesHealth().catch(() => {});

    return unsub;
  }, []);

  // Convenience accessors derived from connectionInfo
  const physicalNodes       = connectionInfo.nodes || [];
  const activeNodeUrl       = connectionInfo.activeUrl || 'http://localhost:8000';
  const activeNodeIndex     = connectionInfo.activeIndex ?? 0;
  const isOnline            = connectionInfo.online ?? false;
  const nodeStatuses        = connectionInfo.nodeStatuses || [];
  const wsState             = connectionInfo.wsState || 'UNKNOWN';
  const lastFailoverEvent   = connectionInfo.lastFailoverEvent || null;

  /**
   * Update the list of physical-system backend URLs at runtime.
   * Accepts a comma-separated string OR an array of URLs.
   * Persists to localStorage so the setting survives a page reload
   * (as long as VITE_API_NODES is not set in .env, in which case .env takes priority at build time).
   */
  const updateNodes = useCallback((urlsInput) => {
    const list = Array.isArray(urlsInput)
      ? urlsInput
      : urlsInput.split(/[,\n]/).map(u => u.trim()).filter(Boolean);
    if (list.length === 0) return;
    localStorage.setItem(NODES_STORAGE, list.join(','));
    apiClient.setNodes(list);
  }, []);

  /**
   * Trigger a fresh health check across all configured nodes immediately.
   * Returns a promise that resolves when all nodes have been checked.
   */
  const refreshNodeHealth = useCallback(() => {
    return apiClient.getAllNodesHealth();
  }, []);

  // ── Gemini API key ──────────────────────────────────────────────────────────
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  });

  const updateApiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem(API_KEY_STORAGE, key);
  };

  // Filter state
  const [filters, setFilters] = useState({
    hazardCategory: 'ALL',
    severity: 'ALL',
    priority: 'ALL', // 'ALL' | 'P0' | 'P1' | 'P2' | 'P3'
    status: 'ALL',
    verifiedOnly: false,
    corroboratedOnly: false,
    searchQuery: ''
  });

  // Save incidents to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
    } catch (e) {
      console.warn("Storage error:", e);
    }
  }, [incidents]);

  // Map severity string to P0-P3 priority code
  const getPriorityCode = (sev) => {
    if (sev === 'CRITICAL') return 'P0';
    if (sev === 'HIGH') return 'P1';
    if (sev === 'MEDIUM') return 'P2';
    return 'P3';
  };

  /**
   * Add Incident with Spatial + Temporal Corroboration Engine (Slide 06)
   */
  const addIncident = (newIncident) => {
    const priority = newIncident.priority || getPriorityCode(newIncident.severity || 'MEDIUM');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check if this new report matches an existing nearby incident
    const corroboration = findCorroboratingIncident(newIncident, incidents);

    if (corroboration && newIncident.isRealDisaster) {
      const parent = corroboration.matchedIncident;
      const updatedCount = (parent.corroboratedReportsCount || 1) + 1;
      const updatedRadius = Math.max(parent.affectedRadiusMeters || 100, corroboration.distanceMeters + 80);

      const updatedEvents = [
        ...(parent.eventsTimeline || []),
        { 
          time: nowTime, 
          text: `Corroborated by new citizen report from ${newIncident.reporterName || 'Citizen'} (${corroboration.distanceMeters}m away)` 
        }
      ];

      // Boost confidence and update parent incident
      const updatedParent = {
        ...parent,
        isCorroborated: true,
        corroboratedReportsCount: updatedCount,
        affectedRadiusMeters: updatedRadius,
        confidence: Math.min(0.99, (parent.confidence || 0.9) + 0.04),
        trappedCount: (parent.trappedCount || 0) + (newIncident.trappedCount || 0),
        needsMedical: parent.needsMedical || newIncident.needsMedical,
        needsBoat: parent.needsBoat || newIncident.needsBoat,
        eventsTimeline: updatedEvents,
        updatedAt: new Date().toISOString()
      };

      setIncidents(prev => prev.map(inc => inc.id === parent.id ? updatedParent : inc));
      setSelectedIncident(updatedParent);
      return { ...updatedParent, wasCorroborated: true, parentId: parent.id };
    }

    // Otherwise create new distinct incident
    const initialEvents = [
      { time: nowTime, text: `Citizen report submitted by ${newIncident.reporterName || 'Citizen'}` },
      { time: nowTime, text: `AI Vision classified ${newIncident.hazardCategory} (${priority} ${newIncident.severity})` },
      { time: nowTime, text: `Incident created and placed on Live Dispatch Queue` }
    ];

    const enriched = {
      ...newIncident,
      id: newIncident.id || `RQN-${Math.floor(1040 + Math.random() * 900)}`,
      priority: priority,
      createdAt: newIncident.createdAt || new Date().toISOString(),
      status: newIncident.status || (newIncident.isRealDisaster ? 'VERIFIED' : 'FLAGGED_FALSE_ALARM'),
      isCorroborated: false,
      corroboratedReportsCount: 1,
      affectedRadiusMeters: 80,
      eventsTimeline: newIncident.eventsTimeline || initialEvents,
      dispatchFactors: newIncident.dispatchFactors || {
        specializationMatch: 95,
        distanceKm: 2.4,
        etaMins: 6,
        unitAvailability: "Available",
        existingWorkload: "Low"
      }
    };

    setIncidents(prev => [enriched, ...prev]);
    setSelectedIncident(enriched);
    return enriched;
  };

  const updateIncidentStatus = (id, newStatus, assignedUnit = null, responderNotes = null) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIncidents(prev => prev.map(inc => {
      if (inc.id === id) {
        const newEvents = [
          ...(inc.eventsTimeline || []),
          { time: nowTime, text: `Status updated to ${newStatus.replace('_', ' ')}${assignedUnit ? ` (Unit: ${assignedUnit})` : ''}` }
        ];

        const updated = {
          ...inc,
          status: newStatus,
          assignedUnit: assignedUnit !== null ? assignedUnit : inc.assignedUnit,
          responderNotes: responderNotes !== null ? responderNotes : inc.responderNotes,
          eventsTimeline: newEvents,
          updatedAt: new Date().toISOString()
        };

        if (selectedIncident && selectedIncident.id === id) {
          setSelectedIncident(updated);
        }
        if (activeResponderIncident && activeResponderIncident.id === id) {
          setActiveResponderIncident(updated);
        }
        return updated;
      }
      return inc;
    }));
  };

  const assignResponder = (incidentId, unitName, etaMinutes = 5, distanceKm = 1.8) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const newEvents = [
          ...(inc.eventsTimeline || []),
          { time: nowTime, text: `${unitName} dispatched (Specialization match: 98%, ETA: ${etaMinutes} mins)` }
        ];

        const updated = {
          ...inc,
          assignedUnit: unitName,
          status: 'DISPATCHED',
          responderEtaMinutes: etaMinutes,
          responderDistanceKm: distanceKm,
          responderNotes: `Unit ${unitName} dispatched to GPS coordinates.`,
          eventsTimeline: newEvents
        };

        if (selectedIncident && selectedIncident.id === incidentId) {
          setSelectedIncident(updated);
        }
        setActiveResponderIncident(updated);
        return updated;
      }
      return inc;
    }));
  };

  const deleteIncident = (id) => {
    setIncidents(prev => prev.filter(inc => inc.id !== id));
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident(null);
    }
  };

  const resetDemoData = () => {
    setIncidents(SEED_INCIDENTS);
    setSelectedIncident(SEED_INCIDENTS[0]);
    setActiveResponderIncident(SEED_INCIDENTS[0]);
    setEmergencyContacts(DEFAULT_EMERGENCY_CONTACTS);
    setSafeHouses(SEED_SAFEHOUSES);
    setVolunteerProfile(DEFAULT_VOLUNTEER_PROFILE);
    setVolunteerStatus('AVAILABLE');
    setVolunteerImpact(DEFAULT_VOLUNTEER_IMPACT);
    setVolunteerTasks(generateTasksFromIncidents(
      SEED_INCIDENTS,
      DEFAULT_VOLUNTEER_PROFILE.latitude,
      DEFAULT_VOLUNTEER_PROFILE.longitude,
      DEFAULT_VOLUNTEER_PROFILE.skills
    ));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_INCIDENTS));
    localStorage.setItem(EMERGENCY_CONTACTS_STORAGE, JSON.stringify(DEFAULT_EMERGENCY_CONTACTS));
    localStorage.setItem(SAFEHOUSE_STORAGE, JSON.stringify(SEED_SAFEHOUSES));
    localStorage.setItem(VOLUNTEER_PROFILE_STORAGE, JSON.stringify(DEFAULT_VOLUNTEER_PROFILE));
    localStorage.setItem(VOLUNTEER_IMPACT_STORAGE, JSON.stringify(DEFAULT_VOLUNTEER_IMPACT));
  };

  // Compute live triage statistics
  const stats = {
    total: incidents.length,
    p0Critical: incidents.filter(i => (i.priority === 'P0' || i.severity === 'CRITICAL') && i.isRealDisaster).length,
    p1High: incidents.filter(i => (i.priority === 'P1' || i.severity === 'HIGH') && i.isRealDisaster).length,
    p2Medium: incidents.filter(i => (i.priority === 'P2' || i.severity === 'MEDIUM') && i.isRealDisaster).length,
    p3Low: incidents.filter(i => (i.priority === 'P3' || i.severity === 'LOW') && i.isRealDisaster).length,
    corroboratedClusters: incidents.filter(i => i.isCorroborated && i.isRealDisaster).length,
    verified: incidents.filter(i => i.isRealDisaster).length,
    falseAlarms: incidents.filter(i => !i.isRealDisaster || i.status === 'FLAGGED_FALSE_ALARM').length,
    activeDispatches: incidents.filter(i => ['DISPATCHED', 'EN_ROUTE', 'ON_SCENE'].includes(i.status)).length,
    resolved: incidents.filter(i => i.status === 'RESOLVED').length,
    // SOS stats
    activeSOS: sosQueue.filter(s => s.status === 'ACTIVE').length,
    sosCritical: sosQueue.filter(s => s.priorityLevel === 'P0').length,
    // SafeHouse & Volunteer stats
    safehousesOpen: safeHouses.filter(s => s.status === 'OPEN' || s.status === 'LIMITED').length,
    volunteerTasksAvailable: volunteerTasks.filter(t => t.status === 'AVAILABLE').length,
  };
  // Aliases used by Navbar ticker (keeps backward compat)
  stats.critical = stats.p0Critical;
  stats.high = stats.p1High;

  return (
    <DisasterContext.Provider value={{
      incidents,
      selectedIncident,
      setSelectedIncident,
      activeResponderIncident,
      setActiveResponderIncident,
      activeView,
      setActiveView,
      filters,
      setFilters,
      isReportModalOpen,
      setIsReportModalOpen,
      isSettingsModalOpen,
      setIsSettingsModalOpen,
      isResilienceModalOpen,
      setIsResilienceModalOpen,
      // ── Team Feature: Emergency Contacts ──────────────────────────────────
      isEmergencyContactsOpen,
      setIsEmergencyContactsOpen,
      emergencyContacts,
      updateEmergencyContact,
      addEmergencyContact,
      resetEmergencyContacts,
      // ── Team Feature: SafeHouses & Relief Shelters ────────────────────────
      isSafeHouseModalOpen,
      setIsSafeHouseModalOpen,
      safeHouses,
      selectedSafeHouse,
      setSelectedSafeHouse,
      showSafeHousesOnMap,
      setShowSafeHousesOnMap,
      updateSafeHouseOccupancy,
      // ── Team Feature: Government & Authority Dispatch ─────────────────────
      isGovDispatchModalOpen,
      setIsGovDispatchModalOpen,
      govDispatchIncident,
      setGovDispatchIncident,
      openGovDispatch,
      emergencyForwardingHistory,
      addForwardingAttempt,
      getIncidentForwardingHistory,
      // ── Team Feature: Volunteer Hub & Tasks ───────────────────────────────
      volunteerProfile,
      updateVolunteerProfile,
      volunteerStatus,
      updateVolunteerStatus,
      volunteerTasks,
      volunteerImpact,
      acceptVolunteerTask,
      completeVolunteerTask,
      // ── Real physical-system connection state ──────────────────────────────
      physicalNodes,       // string[] — configured backend URLs in priority order
      activeNodeUrl,       // string  — currently active machine's URL
      activeNodeIndex,     // number  — index of active node in physicalNodes
      isOnline,            // boolean — true if at least one node is reachable
      nodeStatuses,        // {url, index, isActive, reachable, data, checkedAt}[]
      wsState,             // string  — 'CONNECTED'|'CONNECTING'|'RECONNECTING'|'DISCONNECTED'|'UNKNOWN'
      lastFailoverEvent,   // {fromUrl, fromIndex, toUrl, toIndex, occurredAt} | null
      updateNodes,         // (urlsInput: string|string[]) => void
      refreshNodeHealth,   // () => Promise<nodeStatuses>
      // ── Auth / AI ─────────────────────────────────────────────────────────
      geminiApiKey,
      updateApiKey,
      // ── Incident operations ───────────────────────────────────────────────
      addIncident,
      updateIncidentStatus,
      assignResponder,
      deleteIncident,
      resetDemoData,
      stats,
      // ── SOS queue ─────────────────────────────────────────────────────────
      sosQueue,
      sosQueueLoading,
      sosQueueFilter,
      setSOSQueueFilter,
      loadSOSQueue,
      // ── Responder live GPS ─────────────────────────────────────────────────
      responderLocations,  // { [responderId]: { latitude, longitude, accuracy, heading, speed, timestamp } }
      // ── Live feeds ────────────────────────────────────────────────────────
      activeFeeds,         // DBLiveFeed[] — currently STARTING/LIVE/RECONNECTING feeds from backend
      // ── Volunteer & Fleet System Analysis ──────────────────────────────────
      volunteerAnalysis,
      volunteerAnalysisLoading,
      loadVolunteerAnalysis,
      matchVolunteersForIncident,
    }}>
      {children}
    </DisasterContext.Provider>

  );
}

export function useDisaster() {
  const context = useContext(DisasterContext);
  if (!context) {
    throw new Error('useDisaster must be used within a DisasterProvider');
  }
  return context;
}
