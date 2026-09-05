import React from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  Flame, 
  Waves, 
  Building2, 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  Truck, 
  CheckCircle2,
  AlertTriangle,
  Ban,
  Users,
  Layers,
  Server
} from 'lucide-react';

export default function StatsBar() {
  const { stats, filters, setFilters, setIsResilienceModalOpen,
          physicalNodes, nodeStatuses, isOnline } = useDisaster();

  // Real counts from the actual health-check state — no hardcoding
  const totalNodes     = physicalNodes.length;
  const reachableNodes = nodeStatuses.filter(n => n.reachable).length;

  // Derive a factual, real connection label from actual state
  const clusterLabel = (() => {
    if (!isOnline)                              return 'Offline';
    if (totalNodes <= 1)                        return 'Connected';
    if (reachableNodes === totalNodes)          return 'All Online';
    if (reachableNodes > 0)                     return 'Degraded';
    return 'Offline';
  })();

  // Color theme for the resilience card based on real state
  const isHealthy   = isOnline && reachableNodes === totalNodes && totalNodes > 0;
  const isDegraded  = isOnline && reachableNodes < totalNodes;
  const isOffline   = !isOnline;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-4">
      {/* Total Reports */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, severity: 'ALL', priority: 'ALL', status: 'ALL', verifiedOnly: false }))}
        className="cursor-pointer glass-card hover:bg-slate-800/40 rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg group"
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Total Evidence</span>
          <span className="p-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/50 group-hover:text-white transition-colors">
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-white font-mono tracking-tight">{stats.total}</span>
          <span className="text-[10px] text-slate-400 font-mono">Geotagged</span>
        </div>
      </div>

      {/* P0 Critical Alerts (Slide 07) */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, severity: 'CRITICAL', priority: 'P0', verifiedOnly: true }))}
        className={`cursor-pointer glass-card rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg group ${
          filters.severity === 'CRITICAL' 
            ? 'bg-rose-950/40 border-rose-500/80 ring-2 ring-rose-500/30' 
            : 'border-rose-900/30 hover:border-rose-500/40 hover:bg-rose-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-rose-300">
          <span className="font-semibold flex items-center gap-1.5 text-rose-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            P0 · CRITICAL
          </span>
          <span className="p-1 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40 group-hover:scale-105 transition-transform">
            <Flame className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-rose-400 font-mono tracking-tight">{stats.p0Critical}</span>
          <span className="text-[10px] text-rose-300 uppercase font-bold tracking-wider">Immediate</span>
        </div>
      </div>

      {/* P1 High Priority (Slide 07) */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, severity: 'HIGH', priority: 'P1', verifiedOnly: true }))}
        className={`cursor-pointer glass-card rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg group ${
          filters.severity === 'HIGH' 
            ? 'bg-orange-950/40 border-orange-500/80 ring-2 ring-orange-500/30' 
            : 'border-orange-900/30 hover:border-orange-500/40 hover:bg-orange-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-orange-300">
          <span className="font-semibold text-orange-300">P1 · HIGH</span>
          <span className="p-1 rounded-lg bg-orange-950/60 text-orange-400 border border-orange-800/40 group-hover:scale-105 transition-transform">
            <Waves className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-orange-400 font-mono tracking-tight">{stats.p1High}</span>
          <span className="text-[10px] text-orange-300/90 font-medium">Rapid Dispatch</span>
        </div>
      </div>

      {/* Corroborated Clusters */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, corroboratedOnly: !prev.corroboratedOnly }))}
        className={`cursor-pointer glass-card rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg group ${
          filters.corroboratedOnly 
            ? 'bg-indigo-950/40 border-indigo-500/80 ring-2 ring-indigo-500/30' 
            : 'border-indigo-900/30 hover:border-indigo-500/40 hover:bg-indigo-950/20'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-indigo-300">
          <span className="font-semibold text-indigo-300">Spatial Clusters</span>
          <span className="p-1 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 group-hover:scale-105 transition-transform">
            <Users className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-indigo-400 font-mono tracking-tight">{stats.corroboratedClusters}</span>
          <span className="text-[10px] text-indigo-300/90 font-medium">5-in-1 Merged</span>
        </div>
      </div>

      {/* Dispatched Responders */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, status: 'DISPATCHED' }))}
        className="cursor-pointer glass-card hover:bg-sky-950/25 border-sky-900/30 hover:border-sky-500/40 rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg group"
      >
        <div className="flex items-center justify-between text-xs text-sky-300">
          <span className="font-semibold text-sky-300">Specialized Units</span>
          <span className="p-1 rounded-lg bg-sky-950/60 text-sky-400 border border-sky-800/40 group-hover:scale-105 transition-transform">
            <Truck className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-sky-400 font-mono tracking-tight">{stats.activeDispatches}</span>
          <span className="text-[10px] text-sky-300/90 font-medium">Live Tracked</span>
        </div>
      </div>

      {/* System Resilience Monitor */}
      <div 
        onClick={() => setIsResilienceModalOpen(true)}
        className={`cursor-pointer glass-card rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-lg group ${
          isHealthy  ? 'border-emerald-900/30 hover:border-emerald-500/40 hover:bg-emerald-950/20' :
          isDegraded ? 'border-amber-900/30 hover:border-amber-500/40 hover:bg-amber-950/20' :
                       'border-rose-900/30 hover:border-rose-500/40 hover:bg-rose-950/20'
        }`}
      >
        <div className={`flex items-center justify-between text-xs ${
          isHealthy ? 'text-emerald-300' : isDegraded ? 'text-amber-300' : 'text-rose-300'
        }`}>
          <span className="font-semibold">Cluster Resilience</span>
          <span className={`p-1 rounded-lg border group-hover:scale-105 transition-transform ${
            isHealthy  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' :
            isDegraded ? 'bg-amber-950/60 text-amber-400 border-amber-800/40' :
                         'bg-rose-950/60 text-rose-400 border-rose-800/40'
          }`}>
            <Server className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className={`text-sm font-extrabold font-mono flex items-center gap-1.5 ${
            isHealthy ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isHealthy  ? 'bg-emerald-500 animate-pulse' :
              isDegraded ? 'bg-amber-500 animate-pulse' :
                           'bg-rose-500'
            }`} />
            {totalNodes > 0 ? `${reachableNodes}/${totalNodes} Nodes` : '— Nodes'}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isHealthy ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40' : 
            isDegraded ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40' : 
            'bg-rose-950/80 text-rose-300 border border-rose-800/40'
          }`}>
            {clusterLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
