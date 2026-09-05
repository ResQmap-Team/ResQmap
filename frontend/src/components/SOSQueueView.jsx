import React, { useEffect, useState } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { apiClient } from '../services/api';
import {
  Siren,
  AlertTriangle,
  Clock,
  MapPin,
  Activity,
  Users,
  Heart,
  PersonStanding,
  Truck,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Shield,
  Radio,
  TriangleAlert,
  Baby,
} from 'lucide-react';

// ─── Priority config ────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  P0: {
    label: 'P0 · CRITICAL',
    bg: 'bg-rose-950/60',
    border: 'border-rose-600',
    text: 'text-rose-300',
    badge: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    ping: true,
  },
  P1: {
    label: 'P1 · HIGH',
    bg: 'bg-orange-950/40',
    border: 'border-orange-600/70',
    text: 'text-orange-300',
    badge: 'bg-orange-500 text-white',
    dot: 'bg-orange-400',
    ping: false,
  },
  P2: {
    label: 'P2 · MEDIUM',
    bg: 'bg-amber-950/30',
    border: 'border-amber-600/50',
    text: 'text-amber-300',
    badge: 'bg-amber-500 text-black',
    dot: 'bg-amber-400',
    ping: false,
  },
  P3: {
    label: 'P3 · LOW',
    bg: 'bg-slate-900/60',
    border: 'border-slate-600/40',
    text: 'text-slate-400',
    badge: 'bg-slate-600 text-white',
    dot: 'bg-slate-500',
    ping: false,
  },
};

const STATUS_CONFIG = {
  ACTIVE:     { label: 'ACTIVE',     color: 'text-rose-400 bg-rose-950/60 border-rose-700/50' },
  DISPATCHED: { label: 'DISPATCHED', color: 'text-sky-300 bg-sky-950/60 border-sky-700/50' },
  RESOLVED:   { label: 'RESOLVED',   color: 'text-emerald-300 bg-emerald-950/60 border-emerald-700/50' },
};

function fmtDist(m) {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const diff = Math.round((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shortId(id) {
  if (!id) return '—';
  return id.slice(0, 8).toUpperCase();
}

// ─── Override modal ──────────────────────────────────────────────────────────
function PriorityOverrideModal({ sos, onClose, onSaved }) {
  const [level, setLevel] = useState(sos.priorityLevel || 'P2');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await apiClient.overrideSOSPriority(sos.id, level, 'Dispatcher', reason || null);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to override priority');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          Dispatcher Priority Override
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          SOS <span className="font-mono text-slate-300">{shortId(sos.id)}</span> — AI score: <span className="font-mono text-amber-300">{sos.priorityScore?.toFixed(1)}</span>
        </p>

        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Override Priority Level</label>
          <div className="grid grid-cols-4 gap-2">
            {['P0', 'P1', 'P2', 'P3'].map(p => {
              const cfg = PRIORITY_CONFIG[p];
              return (
                <button
                  key={p}
                  onClick={() => setLevel(p)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    level === p
                      ? `${cfg.badge} border-transparent ring-2 ring-white/30`
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Direct radio contact — confirmed critical injury"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Apply Override'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign responder modal ───────────────────────────────────────────────────
function AssignResponderModal({ sos, onClose, onSaved }) {
  const [responder, setResponder] = useState(sos.assignedResponder || '');
  const [newStatus, setNewStatus] = useState('DISPATCHED');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await apiClient.updateSOSStatus(sos.id, {
        status: newStatus,
        assigned_responder: responder,
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">
          <Truck className="w-4 h-4 text-sky-400" />
          Assign Responder
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          SOS <span className="font-mono text-slate-300">{shortId(sos.id)}</span>
        </p>

        <div className="mb-3">
          <label className="text-xs text-slate-400 mb-1.5 block">Responder / Unit Name</label>
          <input
            value={responder}
            onChange={e => setResponder(e.target.value)}
            placeholder="e.g. DR-Unit-07 / Fire Rescue Team Alpha"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Update Status</label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="ACTIVE">ACTIVE (no change)</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !responder.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Assign & Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SOS Row ─────────────────────────────────────────────────────────────────
function SOSRow({ sos, onOverride, onAssign }) {
  const pCfg = PRIORITY_CONFIG[sos.priorityLevel] || PRIORITY_CONFIG.P3;
  const stCfg = STATUS_CONFIG[sos.status] || STATUS_CONFIG.ACTIVE;

  return (
    <div className={`rounded-xl border ${pCfg.border} ${pCfg.bg} p-4 transition-all hover:brightness-110`}>
      {/* Row header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Priority badge */}
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${pCfg.badge}`}>
          {pCfg.ping && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          {pCfg.label}
        </span>

        {/* Score */}
        <span className={`font-mono text-xs font-bold ${pCfg.text}`}>
          {sos.priorityScore?.toFixed(1)} / 100
        </span>

        {/* Status */}
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${stCfg.color}`}>
          {stCfg.label}
        </span>

        {/* Timestamp */}
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Clock className="w-3 h-3" />
          {fmtTime(sos.createdAt)}
        </span>
      </div>

      {/* Grid of fields */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-xs mb-3">
        {/* SOS ID */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider">SOS ID</span>
          <span className="font-mono text-slate-200 font-semibold">{shortId(sos.id)}</span>
        </div>

        {/* Incident */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Incident</span>
          <span className="font-mono text-slate-300">
            {sos.nearestIncidentId ? shortId(sos.nearestIncidentId) : '—'}
          </span>
        </div>

        {/* Distance from epicenter */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> Dist. to Epicenter
          </span>
          <span className={`font-mono font-semibold ${
            sos.distanceToEpicenterM != null && sos.distanceToEpicenterM < 500
              ? 'text-rose-400'
              : sos.distanceToEpicenterM != null && sos.distanceToEpicenterM < 2000
              ? 'text-amber-400'
              : 'text-slate-300'
          }`}>
            {fmtDist(sos.distanceToEpicenterM)}
          </span>
        </div>

        {/* Victim location */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Victim Location</span>
          <span className="font-mono text-slate-400 text-[11px]">
            {sos.latitude?.toFixed(4)}, {sos.longitude?.toFixed(4)}
          </span>
        </div>

        {/* Medical urgency */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Heart className="w-2.5 h-2.5" /> Medical Urgency
          </span>
          {sos.needsMedical ? (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              YES — URGENT
            </span>
          ) : (
            <span className="text-slate-400">No</span>
          )}
        </div>

        {/* Trapped status */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Trapped</span>
          <span className={`font-semibold ${sos.trappedCount > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
            {sos.trappedCount > 0 ? `${sos.trappedCount} person${sos.trappedCount !== 1 ? 's' : ''}` : 'None reported'}
          </span>
        </div>

        {/* Victim count */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Users className="w-2.5 h-2.5" /> Victim Count
          </span>
          <span className="text-slate-300 font-semibold">
            {(sos.trappedCount || 0) > 0 ? sos.trappedCount : '≥1 (reporter)'}
          </span>
        </div>

        {/* Vulnerable */}
        <div>
          <span className="text-slate-500 block text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Baby className="w-2.5 h-2.5" /> Vulnerable
          </span>
          {sos.hasElderlyOrInfants ? (
            <span className="text-amber-400 font-bold">Elderly / Infants</span>
          ) : (
            <span className="text-slate-400">None</span>
          )}
        </div>
      </div>

      {/* Victim name / phone */}
      {(sos.reporterName || sos.reporterPhone) && (
        <div className="flex flex-wrap gap-3 mb-2 text-xs text-slate-400">
          {sos.reporterName && sos.reporterName !== 'Unknown' && (
            <span className="flex items-center gap-1">
              <PersonStanding className="w-3 h-3 text-slate-500" />
              {sos.reporterName}
            </span>
          )}
          {sos.reporterPhone && (
            <span className="flex items-center gap-1 font-mono">
              📞 {sos.reporterPhone}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {sos.victimNotes && (
        <div className="mb-2 text-xs text-slate-400 bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/40">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">Notes: </span>
          {sos.victimNotes}
        </div>
      )}

      {/* Priority reasons */}
      {Array.isArray(sos.priorityReason) && sos.priorityReason.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {sos.priorityReason.map((r, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-900/60 border border-slate-700/40 rounded-full text-slate-400">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Responder assignment + actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-700/30 pt-3">
        <div className="flex-1 min-w-0">
          {sos.assignedResponder ? (
            <span className="flex items-center gap-1.5 text-xs text-sky-300">
              <Truck className="w-3 h-3" />
              <span className="font-mono font-semibold">{sos.assignedResponder}</span>
              <span className="text-slate-500">assigned</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">No responder assigned</span>
          )}
        </div>

        <button
          onClick={() => onAssign(sos)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-700/60 hover:bg-sky-600/80 text-sky-200 border border-sky-600/40 transition-colors"
        >
          {sos.assignedResponder ? 'Reassign' : 'Assign'}
        </button>

        {!sos.dispatcherOverride && (
          <button
            onClick={() => onOverride(sos)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700/40 hover:bg-amber-600/60 text-amber-300 border border-amber-600/30 transition-colors"
          >
            Override Priority
          </button>
        )}
        {sos.dispatcherOverride && (
          <span className="text-[10px] text-amber-400 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Dispatcher override active
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main SOS Queue View ──────────────────────────────────────────────────────
export default function SOSQueueView() {
  const {
    sosQueue,
    sosQueueLoading,
    sosQueueFilter,
    setSOSQueueFilter,
    loadSOSQueue,
    stats,
    isOnline,
  } = useDisaster();

  const [overrideSOS, setOverrideSOS] = useState(null);
  const [assignSOS, setAssignSOS] = useState(null);
  const [localQueue, setLocalQueue] = useState([]);

  // Keep local queue in sync with context (for optimistic updates from modals)
  useEffect(() => {
    setLocalQueue(sosQueue);
  }, [sosQueue]);

  // Load on mount and filter change
  useEffect(() => {
    if (isOnline) loadSOSQueue(sosQueueFilter);
  }, [isOnline, sosQueueFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (f) => {
    setSOSQueueFilter(f);
  };

  const handleRefresh = () => {
    loadSOSQueue(sosQueueFilter);
  };

  const handleOverrideSaved = (updatedSOS) => {
    setLocalQueue(prev => {
      const next = prev.map(s => s.id === updatedSOS.id ? updatedSOS : s);
      return next.sort((a, b) => b.priorityScore - a.priorityScore);
    });
  };

  const handleAssignSaved = (updatedSOS) => {
    setLocalQueue(prev => {
      const next = prev.map(s => s.id === updatedSOS.id ? updatedSOS : s);
      return next.sort((a, b) => b.priorityScore - a.priorityScore);
    });
  };

  const counts = {
    p0: localQueue.filter(s => s.priorityLevel === 'P0').length,
    p1: localQueue.filter(s => s.priorityLevel === 'P1').length,
    p2: localQueue.filter(s => s.priorityLevel === 'P2').length,
    p3: localQueue.filter(s => s.priorityLevel === 'P3').length,
    active: localQueue.filter(s => s.status === 'ACTIVE').length,
    dispatched: localQueue.filter(s => s.status === 'DISPATCHED').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-600/40 flex items-center justify-center">
            <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base leading-none">SOS Priority Queue</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Command Center · Sorted by AI Priority Score</p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {counts.p0 > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {counts.p0} P0
            </span>
          )}
          {counts.p1 > 0 && (
            <span className="px-2.5 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold">{counts.p1} P1</span>
          )}
          {counts.p2 > 0 && (
            <span className="px-2.5 py-1 bg-amber-500 text-black rounded-lg text-xs font-bold">{counts.p2} P2</span>
          )}
          {counts.p3 > 0 && (
            <span className="px-2.5 py-1 bg-slate-600 text-white rounded-lg text-xs font-bold">{counts.p3} P3</span>
          )}
          <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-mono">
            {localQueue.length} total
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter tabs */}
        <div className="flex items-center bg-[#111827] border border-[#1f293d] rounded-xl p-1 gap-1">
          {[
            { val: 'ACTIVE',     label: 'Active' },
            { val: 'DISPATCHED', label: 'Dispatched' },
            { val: 'RESOLVED',   label: 'Resolved' },
            { val: 'ALL',        label: 'All' },
          ].map(tab => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange(tab.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sosQueueFilter === tab.val
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
              {tab.val === 'ACTIVE' && counts.active > 0 && (
                <span className="ml-1 font-mono">{counts.active}</span>
              )}
              {tab.val === 'DISPATCHED' && counts.dispatched > 0 && (
                <span className="ml-1 font-mono">{counts.dispatched}</span>
              )}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={sosQueueLoading}
          title="Refresh SOS queue from backend"
          className="p-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1f293d] text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${sosQueueLoading ? 'animate-spin' : ''}`} />
        </button>

        {/* Connection indicator */}
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-700/40 px-3 py-1.5 rounded-xl">
            <Radio className="w-3.5 h-3.5" />
            Backend offline — showing cached data
          </span>
        )}

        {isOnline && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-700/30 px-2.5 py-1 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · WebSocket updates active
          </span>
        )}
      </div>

      {/* Priority legend */}
      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
        <span>Priority engine weights:</span>
        <span className="text-rose-400">Distance 35%</span>
        <span>·</span>
        <span className="text-orange-400">Medical 20%</span>
        <span>·</span>
        <span className="text-amber-400">Trapped 20%</span>
        <span>·</span>
        <span className="text-purple-400">Vulnerable 10%</span>
        <span>·</span>
        <span className="text-sky-400">Severity 10%</span>
        <span>·</span>
        <span className="text-slate-400">Wait time 5%</span>
      </div>

      {/* Loading state */}
      {sosQueueLoading && localQueue.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading SOS queue…</span>
        </div>
      )}

      {/* Empty state */}
      {!sosQueueLoading && localQueue.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-600/50" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-400">
              {sosQueueFilter === 'ACTIVE' ? 'No active SOS requests' : 'No SOS requests found'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {isOnline
                ? 'New SOS submissions will appear here instantly via WebSocket.'
                : 'Backend offline — connect to a backend node to see live SOS data.'}
            </p>
          </div>
          {!isOnline && (
            <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/30 px-3 py-2 rounded-lg max-w-xs text-center">
              Start the backend: <span className="font-mono">python run.py</span> or check the Resilience Monitor.
            </p>
          )}
        </div>
      )}

      {/* SOS Cards */}
      {localQueue.length > 0 && (
        <div className="space-y-3">
          {localQueue.map(sos => (
            <SOSRow
              key={sos.id}
              sos={sos}
              onOverride={setOverrideSOS}
              onAssign={setAssignSOS}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {overrideSOS && (
        <PriorityOverrideModal
          sos={overrideSOS}
          onClose={() => setOverrideSOS(null)}
          onSaved={handleOverrideSaved}
        />
      )}
      {assignSOS && (
        <AssignResponderModal
          sos={assignSOS}
          onClose={() => setAssignSOS(null)}
          onSaved={handleAssignSaved}
        />
      )}
    </div>
  );
}
