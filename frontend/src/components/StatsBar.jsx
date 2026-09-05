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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {/* Total Reports */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, severity: 'ALL', priority: 'ALL', status: 'ALL', verifiedOnly: false }))}
        className="cursor-pointer bg-[#111827]/80 hover:bg-[#182234] border border-[#1f293d] rounded-xl p-3 flex flex-col justify-between transition-all hover:border-slate-600 shadow-md"
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Total Evidence</span>
          <span className="p-1 rounded-md bg-slate-800 text-slate-300">
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-white font-mono">{stats.total}</span>
          <span className="text-[10px] text-slate-400">Geotagged</span>
        </div>
      </div>

      {/* P0 Critical Alerts (Slide 07) */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, severity: 'CRITICAL', priority: 'P0', verifiedOnly: true }))}
        className={`cursor-pointer bg-[#111827]/80 hover:bg-rose-950/30 border ${
          filters.severity === 'CRITICAL' ? 'border-rose-500 ring-1 ring-rose-500' : 'border-rose-900/40'
        } rounded-xl p-3 flex flex-col justify-between transition-all shadow-md`}
      >
        <div className="flex items-center justify-between text-xs text-rose-300">
          <span className="font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            P0 · CRITICAL
          </span>
          <span className="p-1 rounded-md bg-rose-950/60 text-rose-400">
            <Flame className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-rose-400 font-mono">{stats.p0Critical}</span>
          <span className="text-[10px] text-rose-300/80 uppercase font-semibold">Immediate</span>
        </div>
      </div>

      {/* P1 High Priority (Slide 07) */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, severity: 'HIGH', priority: 'P1', verifiedOnly: true }))}
        className={`cursor-pointer bg-[#111827]/80 hover:bg-orange-950/30 border ${
          filters.severity === 'HIGH' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-orange-900/40'
        } rounded-xl p-3 flex flex-col justify-between transition-all shadow-md`}
      >
        <div className="flex items-center justify-between text-xs text-orange-300">
          <span className="font-medium">P1 · HIGH</span>
          <span className="p-1 rounded-md bg-orange-950/60 text-orange-400">
            <Waves className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-orange-400 font-mono">{stats.p1High}</span>
          <span className="text-[10px] text-orange-300/80">Rapid Dispatch</span>
        </div>
      </div>

      {/* Corroborated Clusters (Slide 06: "Five reports. One incident.") */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, corroboratedOnly: !prev.corroboratedOnly }))}
        className={`cursor-pointer bg-[#111827]/80 hover:bg-indigo-950/30 border ${
          filters.corroboratedOnly ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-indigo-900/40'
        } rounded-xl p-3 flex flex-col justify-between transition-all shadow-md`}
      >
        <div className="flex items-center justify-between text-xs text-indigo-300">
          <span className="font-medium">Spatial Clusters</span>
          <span className="p-1 rounded-md bg-indigo-950/60 text-indigo-400">
            <Users className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-indigo-400 font-mono">{stats.corroboratedClusters}</span>
          <span className="text-[10px] text-indigo-300/80">5-in-1 Merged</span>
        </div>
      </div>

      {/* Dispatched Responders (Slide 10) */}
      <div 
        onClick={() => setFilters(prev => ({ ...prev, status: 'DISPATCHED' }))}
        className="cursor-pointer bg-[#111827]/80 hover:bg-sky-950/30 border border-sky-900/40 rounded-xl p-3 flex flex-col justify-between transition-all shadow-md"
      >
        <div className="flex items-center justify-between text-xs text-sky-300">
          <span className="font-medium">Specialized Units</span>
          <span className="p-1 rounded-md bg-sky-950/60 text-sky-400">
            <Truck className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-sky-400 font-mono">{stats.activeDispatches}</span>
          <span className="text-[10px] text-sky-300/80">Live Tracked</span>
        </div>
      </div>

      {/* System Resilience Monitor (Slide 12) */}
      <div 
        onClick={() => setIsResilienceModalOpen(true)}
        className={`cursor-pointer bg-[#111827]/80 border rounded-xl p-3 flex flex-col justify-between transition-all shadow-md ${
          isHealthy  ? 'hover:bg-emerald-950/30 border-emerald-900/40' :
          isDegraded ? 'hover:bg-amber-950/30 border-amber-900/40' :
                       'hover:bg-rose-950/30 border-rose-900/40'
        }`}
      >
        <div className={`flex items-center justify-between text-xs ${
          isHealthy ? 'text-emerald-300' : isDegraded ? 'text-amber-300' : 'text-rose-300'
        }`}>
          <span className="font-medium">Cluster Resilience</span>
          <span className={`p-1 rounded-md ${
            isHealthy  ? 'bg-emerald-950/60 text-emerald-400' :
            isDegraded ? 'bg-amber-950/60 text-amber-400' :
                         'bg-rose-950/60 text-rose-400'
          }`}>
            <Server className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className={`text-sm font-extrabold font-mono flex items-center gap-1 ${
            isHealthy ? 'text-emerald-400' : isDegraded ? 'text-amber-400' : 'text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isHealthy  ? 'bg-emerald-500 animate-pulse' :
              isDegraded ? 'bg-amber-500 animate-pulse' :
                           'bg-rose-500'
            }`} />
            {totalNodes > 0 ? `${reachableNodes}/${totalNodes} Nodes` : '— Nodes'}
          </span>
          <span className={`text-[10px] font-medium ${
            isHealthy ? 'text-slate-400' : isDegraded ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {clusterLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
