import React from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  Radio, 
  MapPin, 
  Video, 
  FlaskConical, 
  PlusCircle, 
  Settings, 
  ShieldAlert, 
  Activity,
  Sparkles,
  BarChart3,
  RotateCcw,
  FileText,
  Wifi,
  WifiOff,
  Siren,
  Users,
  HandHeart,
  PhoneCall,
  Home,
  Building2,
} from 'lucide-react';

export default function Navbar() {
  const { 
    activeView, 
    setActiveView, 
    setIsReportModalOpen, 
    setIsSettingsModalOpen,
    setIsResilienceModalOpen,
    setIsEmergencyContactsOpen,
    setIsSafeHouseModalOpen,
    openGovDispatch,
    stats,
    resetDemoData,
    geminiApiKey,
    isOnline,
    activeNodeUrl,
  } = useDisaster();


  return (
    <header className="sticky top-0 z-40 bg-[#0a0e17]/95 backdrop-blur-md border-b border-[#1f293d] shadow-lg">
      {/* Emergency Broadcast Ticker */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 px-4 py-1 border-b border-rose-900/40 text-xs flex items-center justify-between text-rose-300">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span className="font-semibold text-rose-400 uppercase tracking-wider text-[10px] bg-rose-900/40 px-1.5 py-0.5 rounded border border-rose-700/50">
            LIVE TRIAGE FEED
          </span>
          <span className="truncate text-slate-300">
            Active Disasters: <b className="text-rose-400 font-mono">{stats.critical} Critical</b>, <b className="text-amber-400 font-mono">{stats.high} High</b> | First Responders Deployed: <b className="text-emerald-400 font-mono">{stats.activeDispatches} Units</b> | AI False Alarms Blocked: <b className="text-sky-400 font-mono">{stats.falseAlarms}</b>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" />
            AI Damage Assessment: <span className={geminiApiKey ? "text-emerald-400 font-bold" : "text-sky-400 font-bold"}>{geminiApiKey ? "Active" : "Standard Mode"}</span>
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand with Attached RESQ Firefighter Emblem */}
        <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveView('map')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-rose-950/40 border border-slate-700 bg-slate-900">
            <img src="/resq_emblem.png" alt="RESQ SINCE 2026" className="w-full h-full object-cover" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0e17]"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                RESQ<span className="text-rose-500 font-mono">MAP</span>
              </span>
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                SINCE 2026
              </span>
            </div>
          </div>
        </div>


        {/* UNIFIED SINGLE ROW / SLIDER FOR ALL FEATURES */}
        <nav className="flex-1 min-w-0 flex items-center bg-[#111827] p-1 rounded-xl border border-[#1f293d] overflow-x-auto no-scrollbar gap-1">
          {/* 1. Live Response Map */}
          <button
            onClick={() => setActiveView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'map'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Live Map</span>
          </button>

          {/* 2. All Reports Feed */}
          <button
            onClick={() => setActiveView('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'reports'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Reports</span>
            <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px] font-mono">
              {stats.total}
            </span>
          </button>

          {/* 3. SOS Priority Queue */}
          <button
            onClick={() => setActiveView('sos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'sos'
                ? 'bg-rose-700 text-white shadow-md shadow-rose-700/40 ring-1 ring-rose-500/50'
                : 'text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 border border-rose-700/20'
            }`}
          >
            <Siren className="w-3.5 h-3.5" />
            <span>SOS Queue</span>
            {stats.activeSOS > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {stats.activeSOS}
              </span>
            )}
          </button>

          {/* 4. Responder Live Feed */}
          <button
            onClick={() => setActiveView('responder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'responder'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
            <span>Live Feed</span>
            {stats.activeDispatches > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>

          {/* 5. Volunteer Hub Mesh */}
          <button
            onClick={() => setActiveView('volunteers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'volunteers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HandHeart className="w-3.5 h-3.5 text-indigo-400" />
            <span>Volunteer Hub</span>
            <span className="px-1.5 py-0.2 bg-indigo-950/80 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 rounded">
              {stats.volunteerTasksAvailable}
            </span>
          </button>

          {/* 6. Fleet Analytics */}
          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'analytics'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Fleet Analytics</span>
          </button>

          {/* 7. SafeHouse Relief Shelters */}
          <button
            onClick={() => setIsSafeHouseModalOpen(true)}
            title="Find Nearest SafeHouse Shelter"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-slate-300 hover:text-emerald-300 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/30 transition-all active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span>SafeHouse</span>
          </button>

          {/* 8. Emergency Helplines */}
          <button
            onClick={() => setIsEmergencyContactsOpen(true)}
            title="National & State Emergency Helplines"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all active:scale-95"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
            <span>Helplines</span>
          </button>

          {/* 9. Government / Authority Escalation */}
          <button
            onClick={() => openGovDispatch()}
            title="Escalate to NDMA / NDRF / State Authorities"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-slate-300 hover:text-amber-300 hover:bg-amber-950/40 border border-transparent hover:border-amber-500/30 transition-all active:scale-95"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Gov Forward</span>
          </button>

          {/* 10. Judge Sandbox */}
          <button
            onClick={() => setActiveView('sandbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeView === 'sandbox'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-amber-300 hover:text-amber-100 hover:bg-amber-950/40 border border-amber-500/20'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            <span>Judge Sandbox</span>
            <span className="text-[9px] uppercase tracking-wider bg-amber-400 text-black px-1 py-0.2 rounded font-bold">
              Test
            </span>
          </button>
        </nav>

        {/* Global Action & System Controls (Far Right) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Main Dominant Citizen SOS Button */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 border border-rose-400/40 transition-transform active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Submit SOS</span>
            <span className="sm:hidden">SOS</span>
          </button>

          {/* Live connection status badge */}
          <button
            onClick={() => setIsResilienceModalOpen(true)}
            title={isOnline ? `Connected to ${activeNodeUrl} — click to view all machines` : 'All backend machines unreachable — click for details'}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-colors ${
              isOnline
                ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-rose-950/60 border-rose-600/40 text-rose-300 hover:bg-rose-900/60'
            }`}
          >
            {isOnline
              ? <Wifi className="w-3.5 h-3.5" />
              : <WifiOff className="w-3.5 h-3.5" />
            }
            <span className="max-w-[90px] truncate">
              {isOnline
                ? (() => { try { const u = new URL(activeNodeUrl); return `${u.hostname}`; } catch { return 'connected'; } })()
                : 'Offline'
              }
            </span>
          </button>

          {/* System Settings */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            title="API Key & System Settings"
            className="p-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1f293d] text-slate-300 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={resetDemoData}
            title="Reset to Initial Hackathon Demo Data"
            className="p-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1f293d] text-slate-400 hover:text-amber-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}


