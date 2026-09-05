import React, { useState } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  X, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Truck, 
  AlertTriangle, 
  User, 
  Phone, 
  CheckCircle2, 
  Video, 
  Send,
  LifeBuoy,
  Flame,
  Waves,
  Building2,
  Zap,
  Mountain,
  TreePine,
  Ban,
  Trash2,
  Users,
  Layers,
  Activity,
  Award,
  ExternalLink,
  Server
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRIORITY_CONFIG, SEVERITY_CONFIG } from '../data/seedIncidents';

export default function IncidentDrawer() {
  const { 
    selectedIncident, 
    setSelectedIncident, 
    updateIncidentStatus, 
    assignResponder,
    deleteIncident,
    setActiveView,
    setActiveResponderIncident,
    openGovDispatch
  } = useDisaster();

  const [selectedUnit, setSelectedUnit] = useState('Disaster Rescue Unit 17');
  const [responderNotes, setResponderNotes] = useState('');

  if (!selectedIncident) return null;

  const prioConf = PRIORITY_CONFIG[selectedIncident.priority] || SEVERITY_CONFIG[selectedIncident.severity] || PRIORITY_CONFIG.P2;

  const handleStatusChange = (status) => {
    if (status === 'RESOLVED') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    updateIncidentStatus(selectedIncident.id, status, null, responderNotes || null);
  };

  const handleDispatch = () => {
    assignResponder(selectedIncident.id, selectedUnit, 6, 2.4);
  };

  const handleLaunchLiveFeed = () => {
    setActiveResponderIncident(selectedIncident);
    setActiveView('responder');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#0d131f] border-l border-[#1f293d] shadow-2xl flex flex-col transition-transform animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-[#1f293d] bg-[#111827]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl ${prioConf.bg} ${prioConf.color} border ${prioConf.border}`}>
            <span className="font-mono text-sm font-black">{selectedIncident.priority || 'P1'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">{selectedIncident.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${prioConf.badge}`}>
                {prioConf.code} · {prioConf.label}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                selectedIncident.status === 'RESOLVED' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30' :
                selectedIncident.status === 'ON_SCENE' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/30' :
                selectedIncident.status === 'EN_ROUTE' ? 'bg-sky-900/60 text-sky-300 border border-sky-500/30' :
                selectedIncident.status === 'DISPATCHED' ? 'bg-amber-900/60 text-amber-300 border border-amber-500/30' :
                selectedIncident.status === 'FLAGGED_FALSE_ALARM' ? 'bg-rose-950 text-rose-400 border border-rose-600/40' :
                'bg-slate-800 text-slate-300'
              }`}>
                {selectedIncident.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
              {selectedIncident.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => deleteIncident(selectedIncident.id)}
            title="Delete Report"
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedIncident(null)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* Disaster Photo with Zoom Preview & Attribution */}
        <div className="relative rounded-2xl overflow-hidden border border-[#1f293d] bg-black shadow-lg">
          <img
            src={selectedIncident.imageUrl}
            alt={selectedIncident.title}
            className="w-full h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none"></div>

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-black/75 backdrop-blur-md text-white border border-white/20">
              {selectedIncident.hazardCategory}
            </span>
          </div>

          {/* Source Attribution (Slide 04 & 15) */}
          {selectedIncident.sourceAttribution && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] text-slate-300 border border-white/10 flex items-center gap-1">
              <span>{selectedIncident.sourceAttribution}</span>
            </div>
          )}

          {/* Bottom Overlays */}
          <div className="absolute bottom-3 left-3 right-3 text-xs text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              {selectedIncident.latitude.toFixed(4)}, {selectedIncident.longitude.toFixed(4)}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(selectedIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Spatial + Time Corroboration Banner (Slide 06: "Five reports. One incident.") */}
        {selectedIncident.isCorroborated && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/40 text-sky-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-white">
                    Spatial + Time Corroboration Cluster
                  </span>
                  <p className="text-[11px] text-sky-300 mt-0.5">
                    <b>{selectedIncident.corroboratedReportsCount || 5} Independent Citizen Reports</b> clustered into one operational incident.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-sky-900/60 px-2 py-1 rounded border border-sky-400/40 text-white">
                Affected Area: {selectedIncident.affectedRadiusMeters || 420}m
              </span>
            </div>
          </div>
        )}

        {/* Real vs False Alarm Verification Banner */}
        <div className={`p-3.5 rounded-xl border ${
          selectedIncident.isRealDisaster
            ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
            : 'bg-rose-950/40 border-rose-600/40 text-rose-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {selectedIncident.isRealDisaster ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Ban className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-bold text-xs">
                  {selectedIncident.isRealDisaster ? "AI Verified Genuine Emergency" : "Flagged as False Alarm / Hoax"}
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Authenticity Confidence: <b className="font-mono">{selectedIncident.authenticityScore.toFixed(1)}%</b> | Tier-1 & Tier-2 Consistency Check
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
              ResQNet AI
            </span>
          </div>

          {selectedIncident.falseAlarmReason && (
            <p className="mt-2 text-xs bg-rose-900/30 p-2 rounded-lg border border-rose-700/40 text-rose-200">
              <b>Reason:</b> {selectedIncident.falseAlarmReason}
            </p>
          )}
        </div>

        {/* Visual Features Explainability (Key Judge Criteria) */}
        <div className="bg-[#111827]/90 p-4 rounded-xl border border-[#1f293d] shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Visual Features Driving AI Decision</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Confidence: {Math.round(selectedIncident.confidence * 100)}%
            </span>
          </div>

          <div className="space-y-2">
            {selectedIncident.visualFeatures?.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dispatch Specialization Factors (Slide 10) */}
        {selectedIncident.dispatchFactors && (
          <div className="bg-[#111827]/80 p-4 rounded-xl border border-sky-900/40 space-y-2.5">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-sky-400" />
              First Responder Specialization Match (Slide 10)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Specialization</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedIncident.dispatchFactors.specializationMatch}% Match
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Distance / ETA</span>
                <span className="font-mono font-bold text-white">
                  {selectedIncident.dispatchFactors.distanceKm} km ({selectedIncident.dispatchFactors.etaMins}m)
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Availability</span>
                <span className="font-semibold text-sky-400">
                  {selectedIncident.dispatchFactors.unitAvailability}
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Workload</span>
                <span className="font-semibold text-slate-300">
                  {selectedIncident.dispatchFactors.existingWorkload}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Audit Event Lifecycle Timeline (Slide 11: "Every step creates an event") */}
        <div className="bg-[#111827]/80 p-4 rounded-xl border border-[#1f293d] space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-400" />
            Audit Event Timeline (The Full Loop)
          </h4>

          <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
            {selectedIncident.eventsTimeline?.map((ev, i) => (
              <div key={i} className="text-xs text-slate-300 relative">
                <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-sky-500 border-2 border-[#111827]"></span>
                <span className="font-mono text-[10px] text-slate-400 font-bold mr-2">{ev.time}</span>
                <span>{ev.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Citizen SOS Urgency Factors */}
        <div className="bg-[#111827]/80 p-4 rounded-xl border border-[#1f293d]">
          <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Citizen Report & Urgency Factors
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Reporter</span>
              <span className="font-semibold text-white">{selectedIncident.reporterName}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Contact</span>
              <span className="font-mono text-white">{selectedIncident.reporterPhone || 'N/A'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            {selectedIncident.trappedCount > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-600/40 font-bold flex items-center gap-1">
                ⚠️ {selectedIncident.trappedCount} People Trapped
              </span>
            )}
            {selectedIncident.needsBoat && (
              <span className="px-2.5 py-1 rounded-md bg-sky-950 text-sky-300 border border-sky-600/40 font-semibold flex items-center gap-1">
                🚤 Evacuation Boat Needed
              </span>
            )}
            {selectedIncident.needsMedical && (
              <span className="px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-600/40 font-semibold flex items-center gap-1">
                🏥 Medical Urgency
              </span>
            )}
          </div>
        </div>

        {/* First Responder Dispatch & Live Feed Controls */}
        <div className="bg-gradient-to-br from-[#131c2e] to-[#0d1522] p-4 rounded-xl border border-sky-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-sky-400" />
              First Responder Tactical Dispatch
            </h4>
            {selectedIncident.assignedUnit && (
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-600/30">
                Unit Assigned
              </span>
            )}
          </div>

          {!selectedIncident.assignedUnit ? (
            <div className="space-y-2">
              <label className="text-[11px] text-slate-300 block">Select Recommended Specialized Unit:</label>
              <div className="flex gap-2">
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="flex-1 bg-slate-900 text-xs text-white p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-500"
                >
                  <option value="Disaster Rescue Unit 17">Disaster Rescue Unit 17 (Specialized Boat & USAR)</option>
                  <option value="USAR Heavy Squad 1">USAR Heavy Squad 1 (Shoring & Collapse)</option>
                  <option value="Fire Engine 12 & Foam Tender">Fire Engine 12 & Foam Tender</option>
                  <option value="TNEB High-Voltage Isolation Unit">TNEB High-Voltage Isolation Unit</option>
                  <option value="Highways Heavy Excavator Unit 4">Highways Heavy Excavator Unit 4</option>
                </select>
                <button
                  onClick={handleDispatch}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
                >
                  Dispatch
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Assigned Unit:</span>
                <span className="font-bold text-white">{selectedIncident.assignedUnit}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Live Telemetry Distance & ETA:</span>
                <span className="font-mono text-sky-400 font-bold">
                  {selectedIncident.responderDistanceKm || '2.4'} km ({selectedIncident.responderEtaMinutes || '6'} mins)
                </span>
              </div>
            </div>
          )}

          {/* Status Progression Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 block font-medium">Mission Lifecycle Status:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    selectedIncident.status === st
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Government Server Direct Forwarding Action */}
          <button
            onClick={() => openGovDispatch(selectedIncident)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-600/30 via-rose-900/40 to-amber-600/30 hover:from-amber-600/50 hover:to-rose-900/60 text-amber-200 hover:text-white rounded-xl text-xs font-bold border border-amber-500/40 flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
          >
            <Server className="w-4 h-4 text-amber-400" />
            <span>Forward Report to Government Server (NDRF / SEOC / 112)</span>
          </button>

          {/* Connect Live Video Stream Feed */}
          <button
            onClick={handleLaunchLiveFeed}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 border border-rose-400/40 transition-transform active:scale-98"
          >
            <Video className="w-4 h-4 text-rose-200 animate-pulse" />
            <span>Connect Responder Live Video Stream</span>
          </button>
        </div>

      </div>
    </div>
  );
}
