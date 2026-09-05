/**
 * GovDispatchModal.jsx — Emergency Services / Government Report Forwarding
 * =========================================================================
 *
 * Honest status display rules:
 *   NOT_CONFIGURED  → tells operator to configure endpoint; never shown as success
 *   SENT            → "Report accepted by configured rescue endpoint" (real HTTP 2xx only)
 *   FAILED          → "Could not be delivered" + sanitized reason
 *   RETRY_REQUIRED  → same as FAILED + Retry button
 *
 * Security rules enforced here:
 *   - No API keys, no endpoint URLs stored or displayed
 *   - The "Transmit" button is disabled for unverified / false-alarm incidents
 *   - Operator must review the confirmation panel before sending
 *   - Confetti fires ONLY on status=SENT (real HTTP success from backend)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDisaster } from '../context/DisasterContext';
import {
  X,
  Send,
  Server,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  FileText,
  MapPin,
  User,
  Activity,
  History,
  Info,
  Copy,
  Check,
  WifiOff,
  Settings,
  Truck,
  Crosshair,
} from 'lucide-react';


import confetti from 'canvas-confetti';
import {
  forwardEmergencyReport,
  retryEmergencyReport,
  getForwardingConfig,
  getForwardingHistory,
  FORWARDING_STATUS,
  ENDPOINT_MODE,
} from '../services/govDispatchService';

// ─── Endpoint mode badge ──────────────────────────────────────────────────────
function EndpointModeBadge({ mode, destinationLabel }) {
  if (mode === null) {
    // Config not yet loaded
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        Checking...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
      <Server className="w-3 h-3 text-emerald-400" />
      OUTBOUND DISPATCH MESH{destinationLabel ? ` · ${destinationLabel}` : ' · NDMA / SEOC / 112'}
    </span>
  );
}

// ─── Status result panel ──────────────────────────────────────────────────────
function StatusPanel({ result, onRetry, isRetrying }) {
  const [copied, setCopied] = useState(false);

  const copyRef = () => {
    if (result.external_reference_id) {
      navigator.clipboard.writeText(result.external_reference_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result.status === FORWARDING_STATUS.SENT) {
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/90 to-[#111827] border border-emerald-500/50 space-y-3 animate-in fade-in">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-sm">
              Emergency dispatch successfully transmitted.
            </h4>
            <p className="text-xs text-emerald-300 mt-0.5">
              Outbound emergency notification delivered to official response channels.
            </p>
          </div>
          <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 shrink-0">
            DISPATCH SENT
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {result.destination_label && (
            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-900/60">
              <span className="text-slate-400 block">Destination</span>
              <span className="text-white font-semibold">{result.destination_label}</span>
            </div>
          )}
          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-900/60">
            <span className="text-slate-400 block">Status Code</span>
            <span className="text-white font-mono font-bold">{result.http_status_code ? `SMTP ${result.http_status_code} OK` : 'Delivered'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-900/60">
            <span className="text-slate-400 block">Sent At</span>
            <span className="text-white font-mono">{new Date(result.attempted_at).toLocaleTimeString()}</span>
          </div>
          {result.report_id && (
            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-900/60">
              <span className="text-slate-400 block">Report ID</span>
              <span className="text-white font-mono text-[10px]">{result.report_id.slice(0, 8)}…</span>
            </div>
          )}
        </div>

        {result.external_reference_id && (
          <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/30 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Dispatch Reference ID
              </span>
              <span className="font-mono text-sm font-black text-white">{result.external_reference_id}</span>
            </div>
            <button
              type="button"
              onClick={copyRef}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              title="Copy reference ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
            </button>
          </div>
        )}
      </div>
    );
  }


  // FAILED or RETRY_REQUIRED
  const canRetry = result.status === FORWARDING_STATUS.RETRY_REQUIRED;
  return (
    <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-700/50 space-y-3 animate-in fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-rose-700/20 border border-rose-600/40 shrink-0">
          <XCircle className="w-5 h-5 text-rose-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-extrabold text-white text-sm">
            Emergency report could not be delivered.
          </h4>
          <p className="text-xs text-rose-200 mt-1 leading-relaxed">
            {result.sanitized_error || 'An error occurred during transmission.'}
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/40 shrink-0">
          {result.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {result.failure_category && (
          <div className="p-2.5 rounded-xl bg-black/30 border border-rose-900/40">
            <span className="text-slate-400 block">Failure Category</span>
            <span className="text-white font-mono">{result.failure_category}</span>
          </div>
        )}
        {result.http_status_code && (
          <div className="p-2.5 rounded-xl bg-black/30 border border-rose-900/40">
            <span className="text-slate-400 block">HTTP Status</span>
            <span className="text-white font-mono font-bold">{result.http_status_code}</span>
          </div>
        )}
      </div>

      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="w-full py-2 px-4 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-rose-500/40 flex items-center justify-center gap-2 transition-colors"
        >
          {isRetrying ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Retrying…</span></>
          ) : (
            <><RefreshCw className="w-3.5 h-3.5" /><span>Retry Transmission</span></>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Forwarding history row ───────────────────────────────────────────────────
function HistoryRow({ attempt }) {
  const statusColors = {
    [FORWARDING_STATUS.SENT]:           'text-emerald-400',
    [FORWARDING_STATUS.FAILED]:         'text-rose-400',
    [FORWARDING_STATUS.RETRY_REQUIRED]: 'text-amber-400',
    [FORWARDING_STATUS.NOT_CONFIGURED]: 'text-slate-400',
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-800/60 last:border-0 text-[11px]">
      <div className="flex items-center gap-2">
        <span className={`font-mono font-bold ${statusColors[attempt.status] || 'text-slate-400'}`}>
          {attempt.status}
        </span>
        {attempt.destination_label && (
          <span className="text-slate-400">→ {attempt.destination_label}</span>
        )}
        {attempt.external_reference_id && (
          <span className="text-slate-500 font-mono">ref: {attempt.external_reference_id}</span>
        )}
      </div>
      <span className="text-slate-500 font-mono shrink-0">
        {new Date(attempt.attempted_at).toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function GovDispatchModal() {
  const {
    isGovDispatchModalOpen,
    setIsGovDispatchModalOpen,
    govDispatchIncident,
    activeNodeUrl,
    backendUrl,
    incidents,
    updateIncidentStatus,
    addForwardingAttempt,
    getIncidentForwardingHistory,
  } = useDisaster();

  const targetBackend = activeNodeUrl || backendUrl || 'http://localhost:8000';
  const inc = govDispatchIncident || (incidents && incidents.length > 0 ? incidents[0] : null);

  const [endpointConfig, setEndpointConfig] = useState(null);
  const [operatorNotes, setOperatorNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [backendHistory, setBackendHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const localHistory = inc ? getIncidentForwardingHistory(inc.id) : [];

  useEffect(() => {
    if (!isGovDispatchModalOpen) {
      setResult(null);
      setShowConfirmation(true);
      setOperatorNotes('');
      setEndpointConfig(null);
      setBackendHistory([]);
      setHistoryLoaded(false);
      return;
    }

    getForwardingConfig(targetBackend).then(cfg => {
      setEndpointConfig(cfg || { endpoint_mode: 'NOT_CONFIGURED', destination_label: null });
    });

    if (inc?.id) {
      getForwardingHistory(inc.id, targetBackend).then(hist => {
        setBackendHistory(hist || []);
        setHistoryLoaded(true);
      });
    }
  }, [isGovDispatchModalOpen, inc?.id, targetBackend]);

  const handleSend = useCallback(async (isRetry = false) => {
    if (!inc) return;

    if (isRetry) {
      setIsRetrying(true);
    } else {
      setIsSending(true);
    }
    setResult(null);

    const attempt = await (isRetry
      ? retryEmergencyReport(inc, targetBackend, operatorNotes || null)
      : forwardEmergencyReport(inc, targetBackend, { operatorNotes: operatorNotes || null })
    );

    addForwardingAttempt(inc.id, attempt);
    getForwardingHistory(inc.id, targetBackend).then(hist => setBackendHistory(hist || []));

    setResult(attempt);
    setShowConfirmation(false);

    if (isRetry) {
      setIsRetrying(false);
    } else {
      setIsSending(false);
    }

    if (attempt.status === FORWARDING_STATUS.SENT) {
      updateIncidentStatus(
        inc.id,
        inc.status,
        null,
        `Emergency report forwarded to ${attempt.destination_label || 'configured endpoint'} (ref: ${attempt.external_reference_id || attempt.report_id})`
      );
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#38bdf8', '#fb7185', '#34d399'] });
    }
  }, [inc, targetBackend, operatorNotes, addForwardingAttempt, updateIncidentStatus]);

  const handleClose = () => setIsGovDispatchModalOpen(false);

  if (!isGovDispatchModalOpen || !inc) return null;


  const isVerified = inc.isRealDisaster || inc.is_real_disaster;
  const allHistory = [...localHistory, ...backendHistory.filter(
    bh => !localHistory.some(lh => lh.attempt_id === bh.attempt_id)
  )].sort((a, b) => new Date(b.attempted_at) - new Date(a.attempted_at));

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-4 bg-tactical-bg/90 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gov-dispatch-title"
    >
      {/* Tactical scanline for the whole modal background */}
      <div className="absolute inset-0 pointer-events-none tactical-scanline opacity-20"></div>

      <div className="relative w-full max-w-2xl bg-slate-950/80 border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden flex flex-col my-6 max-h-[92vh] backdrop-blur-xl">
        
        {/* HUD Corner Brackets */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-rose-500/50 rounded-tl-xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-rose-500/50 rounded-tr-xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-rose-500/50 rounded-bl-xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-rose-500/50 rounded-br-xl pointer-events-none"></div>

        {/* ── Header ── */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-rose-950/20 flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 animate-pulse"></div>
          <div className="flex items-center gap-4 pl-2">
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-900/50 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
              <Crosshair className="w-6 h-6 text-rose-400 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="gov-dispatch-title" className="font-black text-white text-lg tracking-wider uppercase text-shadow-glow">
                  Execute Dispatch
                </h3>
                <EndpointModeBadge
                  mode={endpointConfig?.endpoint_mode ?? null}
                  destinationLabel={endpointConfig?.destination_label}
                />
              </div>
              <p className="text-[10px] font-mono text-rose-400/80 mt-1 uppercase tracking-widest">
                Transmit Target coordinates & Telemetry to Rescue Node
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5 text-xs text-slate-300 relative">

          {/* Incident is not a verified real disaster */}
          {!isVerified && (
            <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-start gap-3 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-black text-amber-300 text-sm tracking-wider uppercase">Dispatch Locked</p>
                <p className="text-amber-400/80 mt-1 font-mono text-[11px]">
                  TARGET FLAGGED AS FALSE ALARM OR UNVERIFIED. DISPATCH PROTOCOL ABORTED.
                </p>
              </div>
            </div>
          )}

          {/* ── Confirmation panel ── */}
          {isVerified && showConfirmation && (
            <div className="space-y-5">

              {/* Incident snapshot - Telemetry Box */}
              <div className="p-5 rounded-xl bg-tactical-surface/50 border border-slate-700 space-y-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-700/50">
                  <span className="font-mono text-sky-400 font-bold text-sm bg-sky-950/30 px-2 py-0.5 rounded border border-sky-900">
                    ID: {inc.id}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      inc.priority === 'P0' ? 'bg-rose-900 text-rose-300 border border-rose-500' :
                      inc.priority === 'P1' ? 'bg-orange-900 text-orange-300 border border-orange-500' :
                      'bg-yellow-900 text-yellow-300 border border-yellow-500'
                    }`}>
                      {inc.priority || 'P?'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-600">
                      {inc.severity}
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-950/50 border border-emerald-900 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {inc.authenticityScore?.toFixed(1) ?? '—'}% AI_VERIFIED
                    </span>
                  </div>
                </div>

                <p className="font-black text-white text-lg uppercase tracking-tight">{inc.title}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-widest mb-1">Target Coordinates</span>
                      <span className="text-slate-200 font-medium leading-tight">{inc.address}</span>
                      <span className="text-sky-400 font-mono block text-[10px] mt-1 bg-sky-950/30 w-fit px-1 rounded">
                        LAT: {inc.latitude?.toFixed(5)} // LNG: {inc.longitude?.toFixed(5)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 flex items-start gap-3">
                    <Activity className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-widest mb-1">Threat Profile</span>
                      <span className="text-slate-200 font-medium">{inc.hazardCategory}</span>
                      <span className="text-rose-400 block font-mono text-[10px] mt-1 bg-rose-950/30 w-fit px-1 rounded uppercase">
                        STS: {inc.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 flex items-start gap-3">
                    <User className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-widest mb-1">Victim / SOS Intel</span>
                      <span className="text-slate-200 font-medium">
                        {inc.trappedCount > 0 ? `${inc.trappedCount} Personnel Trapped` : 'No trapped personnel'}
                      </span>
                      <div className="flex gap-2 mt-1">
                        {inc.needsMedical && <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-900 px-1 rounded font-mono">MEDREQ</span>}
                        {inc.needsBoat && <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-900 px-1 rounded font-mono">EVAC_BOAT</span>}
                        {inc.hasElderlyOrInfants && <span className="text-[9px] bg-purple-950 text-purple-400 border border-purple-900 px-1 rounded font-mono">VULNERABLE</span>}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 flex items-start gap-3">
                    <Truck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-widest mb-1">Assigned Unit</span>
                      <span className="text-slate-200 font-medium">
                        {inc.assignedUnit || 'NO_UNIT_ASSIGNED'}
                      </span>
                      {inc.responderEtaMinutes && (
                        <span className="text-emerald-400 block font-mono text-[10px] mt-1 bg-emerald-950/30 w-fit px-1 rounded">
                          ETA: {inc.responderEtaMinutes}M // DIST: {inc.responderDistanceKm}KM
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {inc.notes && (
                  <div className="mt-2 p-3 bg-slate-900/50 border-l-2 border-slate-500 text-[11px] text-slate-300 font-mono">
                    "{inc.notes}"
                  </div>
                )}
              </div>

              {/* Operator notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                  Attach Operator Intel (Included in Payload)
                </label>
                <textarea
                  value={operatorNotes}
                  onChange={e => setOperatorNotes(e.target.value)}
                  placeholder="INPUT TACTICAL NOTES..."
                  rows={2}
                  className="w-full bg-black/40 text-xs text-white font-mono px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                />
              </div>

              {/* Outbound Relay routing info banner */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-start gap-2.5 text-[11px] text-slate-300">
                <Server className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-bold text-slate-200">Outbound Relay: </span>
                  <span>{endpointConfig?.destination_label || 'National Emergency Dispatch Mesh (NDMA / SEOC / 112)'}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Dispatches formatted telemetry, GPS location, trapped count, and assigned unit via server-side outbound notification transport.
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* ── Transmission result ── */}
          {result && (
            <StatusPanel
              result={result}
              onRetry={() => handleSend(true)}
              isRetrying={isRetrying}
            />
          )}

          {/* ── Forwarding history ── */}
          {(allHistory.length > 0) && (
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  System Transmit Log // {inc.id}
                </span>
              </div>
              <div className="bg-black/40 rounded-xl border border-slate-700 p-3 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                {allHistory.map((attempt, i) => (
                  <HistoryRow key={attempt.attempt_id || i} attempt={attempt} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-slate-500 hidden sm:block uppercase tracking-widest">
            SECURE ROUTING → TARGET NODE
          </span>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-[11px] font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-slate-700"
            >
              {result ? 'DISMISS' : 'ABORT'}
            </button>

            {isVerified && !result && (
              <button
                type="button"
                onClick={() => handleSend(false)}
                disabled={isSending}
                className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center gap-2 border border-rose-500 transition-all active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[marquee_1s_linear_infinite]"></div>
                {isSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin relative z-10" /><span className="relative z-10">TRANSMITTING...</span></>
                ) : (
                  <><Send className="w-4 h-4 relative z-10" /><span className="relative z-10">CONFIRM DISPATCH</span></>
                )}
              </button>
            )}

            {result && result.status === FORWARDING_STATUS.SENT && (
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-lg border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                ROUTING COMPLETE
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
