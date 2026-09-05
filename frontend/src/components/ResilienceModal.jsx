import React, { useState } from 'react';
import { useDisaster } from '../context/DisasterContext';
import {
  X,
  Server,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Monitor,
  ArrowRight,
  Radio,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

/**
 * ResilienceModal — Real Physical-System Health Panel
 *
 * Shows the actual health status of each configured physical teammate machine
 * based on real /api/health network checks. No fake toggles or simulated outages.
 *
 * Data sources (all real, from apiClient via DisasterContext):
 *  - nodeStatuses     — per-node reachability, /api/health data, last check time
 *  - wsState          — actual WebSocket readyState transitions
 *  - lastFailoverEvent — recorded only when the active node actually switched
 *  - isOnline         — true only when at least one node responds
 *  - activeNodeIndex  — which configured node is currently active
 */
export default function ResilienceModal() {
  const {
    isResilienceModalOpen,
    setIsResilienceModalOpen,
    physicalNodes,
    activeNodeUrl,
    activeNodeIndex,
    isOnline,
    nodeStatuses,
    wsState,
    lastFailoverEvent,
    refreshNodeHealth,
  } = useDisaster();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  if (!isResilienceModalOpen) return null;

  const reachableCount = nodeStatuses.filter(n => n.reachable).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNodeHealth();
      setLastRefreshed(new Date());
    } catch (e) {
      // errors handled inside apiClient
    } finally {
      setIsRefreshing(false);
    }
  };

  /** Format "host:port" or "host" from a full URL for compact display. */
  const formatUrl = (url) => {
    try {
      const u = new URL(url);
      return u.port ? `${u.hostname}:${u.port}` : u.hostname;
    } catch {
      return url;
    }
  };

  /** Hostname only (no port) for very short labels. */
  const formatHost = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  /** Human-readable "X ago" for a checkedAt ISO string. */
  const formatCheckedAt = (checkedAt) => {
    if (!checkedAt) return 'Never';
    const d = new Date(checkedAt);
    const diffSec = Math.round((Date.now() - d) / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    return `${Math.round(diffSec / 60)}m ago`;
  };

  /** Human-readable absolute time for failover events. */
  const formatAbsoluteTime = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  /**
   * Node role label: the first configured node is PRIMARY (index 0),
   * subsequent nodes are BACKUP in priority order.
   * Role comes from configured order only — never invented.
   */
  const nodeRole = (index) => (index === 0 ? 'PRIMARY' : `BACKUP ${index}`);

  /**
   * Derive a precise health status string from actual check data.
   * States that actually exist in the architecture:
   *  HEALTHY   — reachable and responded OK to /api/health
   *  UNHEALTHY — responded but not OK (reachable: false + checkedAt set)
   *  CHECKING  — no checkedAt yet — initial startup window
   *
   * Note: The current architecture does not distinguish "HTTP 4xx/5xx" from
   * "connection refused" in stored state — both land as reachable: false.
   * We call both UNHEALTHY when checkedAt is present, CHECKING otherwise.
   */
  const nodeHealthStatus = (node) => {
    if (!node.checkedAt)   return { label: 'CHECKING',  color: 'text-slate-400',   bg: 'bg-slate-800/40',    border: 'border-slate-700' };
    if (node.reachable)    return { label: 'HEALTHY',   color: 'text-emerald-400', bg: 'bg-emerald-950/30',  border: 'border-emerald-600/40' };
    return                        { label: 'UNHEALTHY', color: 'text-rose-400',    bg: 'bg-rose-950/20',     border: 'border-rose-700/30' };
  };

  /**
   * WebSocket state display config.
   * Reflects _wsState from api.js lifecycle handlers — never faked.
   */
  const wsDisplay = (() => {
    switch (wsState) {
      case 'CONNECTED':    return { label: 'CONNECTED',    color: 'text-emerald-400', dotClass: 'bg-emerald-400 animate-pulse', icon: <Wifi className="w-3.5 h-3.5" /> };
      case 'CONNECTING':   return { label: 'CONNECTING',   color: 'text-sky-400',     dotClass: 'bg-sky-400 animate-ping',      icon: <Radio className="w-3.5 h-3.5" /> };
      case 'RECONNECTING': return { label: 'RECONNECTING', color: 'text-amber-400',   dotClass: 'bg-amber-400 animate-ping',    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" /> };
      case 'DISCONNECTED': return { label: 'DISCONNECTED', color: 'text-rose-400',    dotClass: 'bg-rose-500',                  icon: <WifiOff className="w-3.5 h-3.5" /> };
      default:             return { label: 'UNKNOWN',      color: 'text-slate-400',   dotClass: 'bg-slate-600',                 icon: <Activity className="w-3.5 h-3.5" /> };
    }
  })();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d131f] border border-[#1f293d] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-[#1f293d] bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isOnline ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-600/20 text-rose-400 border-rose-500/40'}`}>
              {isOnline ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                Physical System Status
              </span>
              <h3 className="font-extrabold text-white text-base">
                Multi-Machine Backend Hosts
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh health status from all machines"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsResilienceModalOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300 max-h-[80vh] overflow-y-auto">

          {/* ── Overall summary ─────────────────────────────────────── */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isOnline
              ? 'bg-emerald-950/30 border-emerald-600/30'
              : 'bg-rose-950/30 border-rose-600/30'
          }`}>
            <div className="flex items-center gap-2.5">
              {isOnline
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              }
              <div>
                <span className="font-bold text-white block">
                  {isOnline
                    ? `Connected — ${reachableCount} of ${physicalNodes.length} machine${physicalNodes.length !== 1 ? 's' : ''} reachable`
                    : 'All machines unreachable'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isOnline
                    ? `Active host: ${formatUrl(activeNodeUrl)}`
                    : 'Check network connectivity and that backends are running'
                  }
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
              isOnline
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                : 'bg-rose-950 text-rose-300 border-rose-600/40'
            }`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* ── No nodes configured warning ────────────────────────── */}
          {physicalNodes.length === 0 && (
            <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-xl text-amber-300 text-xs">
              <b>No backend nodes configured.</b> Set <code className="bg-black/30 px-1 rounded">VITE_API_NODES</code> in
              {' '}<code className="bg-black/30 px-1 rounded">frontend/.env</code> or use Settings to enter your teammates' IPs.
            </div>
          )}

          {/* ── Per-machine status list ─────────────────────────────── */}
          <div className="space-y-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block">
              Configured Physical Machines ({physicalNodes.length}):
            </span>

            {nodeStatuses.length === 0 && physicalNodes.length === 0 && (
              <p className="text-slate-500 text-xs italic">
                No machines configured. Open Settings to add backend URLs.
              </p>
            )}

            {nodeStatuses.map((node) => {
              const health    = nodeHealthStatus(node);
              const role      = nodeRole(node.index);
              const isPrimary = node.index === 0;

              return (
                <div
                  key={node.url}
                  className={`p-3 rounded-xl border transition-all ${
                    node.isActive
                      ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/20'
                      : `${health.bg} ${health.border}`
                  }`}
                >
                  {/* Top row: dot + host + badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                        node.reachable
                          ? node.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'
                          : node.checkedAt ? 'bg-rose-500' : 'bg-slate-600'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Role badge — from configured order, never invented */}
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold shrink-0 border ${
                            isPrimary
                              ? 'bg-sky-900/60 text-sky-300 border-sky-600/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {role}
                          </span>

                          {/* Host:port */}
                          <span className="font-mono text-white font-bold text-xs truncate">
                            {formatUrl(node.url)}
                          </span>

                          {/* ACTIVE badge */}
                          {node.isActive && (
                            <span className="text-[9px] uppercase tracking-wider bg-emerald-600/80 text-white px-1.5 py-0.5 rounded font-bold shrink-0">
                              ACTIVE
                            </span>
                          )}

                          {/* Health status badge */}
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold shrink-0 ${health.color} bg-black/20`}>
                            {health.label}
                          </span>
                        </div>

                        {/* Full URL */}
                        <span className="text-[10px] text-slate-500 font-mono truncate block mt-0.5">
                          {node.url}
                        </span>
                      </div>
                    </div>

                    {/* Last check time */}
                    <div className="flex items-center gap-1 text-slate-500 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{formatCheckedAt(node.checkedAt)}</span>
                    </div>
                  </div>

                  {/* Health data from /api/health response */}
                  {node.reachable && node.data && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-700/50 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Monitor className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="text-slate-500">Node ID:</span>
                        <span className="font-mono text-white">{node.data.node || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Database className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="text-slate-500">Database:</span>
                        <span className={`font-mono font-bold ${node.data.db_mode === 'postgres' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {node.data.db_mode === 'postgres' ? 'Supabase ✓' : 'SQLite (local)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Activity className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="text-slate-500">LAN IP:</span>
                        <span className="font-mono text-white">{node.data.lan_ip || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Server className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="text-slate-500">Backend:</span>
                        <span className="font-mono text-emerald-400">{node.data.status || 'ok'}</span>
                      </div>
                    </div>
                  )}

                  {/* Unreachable hint */}
                  {!node.reachable && node.checkedAt && (
                    <p className="mt-2 text-[10px] text-rose-400/70 italic">
                      Backend not responding. Verify the machine is on the same network and{' '}
                      <code className="bg-black/20 px-1 rounded">python run.py</code> is running.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── WebSocket Status ─────────────────────────────────────── */}
          <div className="pt-1">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block mb-2">
              WebSocket Connection:
            </span>
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              wsState === 'CONNECTED'    ? 'bg-emerald-950/20 border-emerald-600/30' :
              wsState === 'CONNECTING'   ? 'bg-sky-950/20 border-sky-600/30' :
              wsState === 'RECONNECTING' ? 'bg-amber-950/20 border-amber-600/30' :
              wsState === 'DISCONNECTED' ? 'bg-rose-950/20 border-rose-600/30' :
                                           'bg-slate-900/40 border-slate-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${wsDisplay.dotClass} shrink-0`} />
                <span className={`${wsDisplay.color} font-mono font-bold text-xs`}>
                  {wsDisplay.label}
                </span>
                <span className="text-slate-500 text-[10px]">
                  {wsState === 'CONNECTED'
                    ? `to ${formatHost(activeNodeUrl)}`
                    : wsState === 'RECONNECTING'
                    ? '— retrying…'
                    : wsState === 'CONNECTING'
                    ? '— establishing…'
                    : wsState === 'DISCONNECTED'
                    ? '— no active backend'
                    : ''
                  }
                </span>
              </div>
              <span className={`${wsDisplay.color}`}>{wsDisplay.icon}</span>
            </div>
          </div>

          {/* ── Last Failover Event ──────────────────────────────────── */}
          <div className="pt-1">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block mb-2">
              Last Failover Event:
            </span>
            {lastFailoverEvent ? (
              <div className="p-3 bg-amber-950/20 border border-amber-700/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-mono text-rose-300 font-bold">
                    {nodeRole(lastFailoverEvent.fromIndex)}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    ({formatHost(lastFailoverEvent.fromUrl || '')})
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="font-mono text-emerald-300 font-bold">
                    {nodeRole(lastFailoverEvent.toIndex)}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    ({formatHost(lastFailoverEvent.toUrl || '')})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                  <Clock className="w-3 h-3" />
                  <span>Occurred at {formatAbsoluteTime(lastFailoverEvent.occurredAt)}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/40 border border-slate-700 rounded-xl">
                <p className="text-slate-500 text-[11px] italic">
                  No failover has occurred during this session.
                  {physicalNodes.length <= 1 && (
                    <span> Configure additional nodes via <code className="bg-black/20 px-1 rounded">VITE_API_NODES</code> to enable automatic failover.</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Shared database note ─────────────────────────────────── */}
          {reachableCount > 0 && nodeStatuses.some(n => n.reachable && n.data?.db_mode === 'postgres') && (
            <div className="p-3 bg-sky-950/30 border border-sky-700/30 rounded-xl flex items-start gap-2">
              <Database className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-sky-300 leading-relaxed">
                <b>Shared Supabase database confirmed.</b> All reachable machines are reading
                from the same PostgreSQL instance — incidents created on one machine are
                visible on all others.
              </p>
            </div>
          )}

          {/* ── SQLite warning ───────────────────────────────────────── */}
          {reachableCount > 0 && nodeStatuses.some(n => n.reachable && n.data?.db_mode === 'sqlite') && (
            <div className="p-3 bg-amber-950/30 border border-amber-700/30 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300 leading-relaxed">
                <b>One or more machines using SQLite (local only).</b> Data will NOT be
                shared between machines. Set <code className="bg-black/30 px-1 rounded">DATABASE_URL</code> in
                {' '}<code className="bg-black/30 px-1 rounded">.env</code> to the shared Supabase PostgreSQL URL.
              </p>
            </div>
          )}

          {/* ── Last refresh note ─────────────────────────────────────── */}
          {lastRefreshed && (
            <p className="text-[10px] text-slate-500 text-right">
              Last manual refresh: {lastRefreshed.toLocaleTimeString()}
            </p>
          )}

          {/* ── Footer buttons ────────────────────────────────────────── */}
          <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking…' : 'Refresh Now'}</span>
            </button>
            <button
              onClick={() => setIsResilienceModalOpen(false)}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
