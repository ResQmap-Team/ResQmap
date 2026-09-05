import React, { useState, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import resqEmblem from '../assets/resq_emblem.png';
import { 
  Radio, 
  MapPin, 
  Video, 
  PlusCircle, 
  Settings, 
  ShieldAlert, 
  Activity,
  Sparkles,
  BarChart3,
  FileText,
  Wifi,
  WifiOff,
  Siren,
  Users,
  HandHeart,
  PhoneCall,
  Home,
  Building2,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Flame,
  AlertTriangle
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
    geminiApiKey,
    isOnline,
    activeNodeUrl,
  } = useDisaster();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on ESC key or when window is resized to large
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavSelect = (viewName) => {
    setActiveView(viewName);
    setIsDrawerOpen(false);
  };

  const handleAction = (callback) => {
    setIsDrawerOpen(false);
    callback();
  };

  return (
    <>
      <header className="sticky top-0 z-[2000] bg-[#070b14]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
        {/* Emergency Broadcast Ticker */}
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-950 to-rose-950/80 px-3 sm:px-4 py-1 border-b border-rose-900/30 text-xs flex items-center justify-between text-rose-300">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="font-semibold text-rose-400 uppercase tracking-wider text-[10px] bg-rose-900/40 px-1.5 py-0.5 rounded border border-rose-700/50 shrink-0">
              LIVE TRIAGE FEED
            </span>
            <span className="truncate text-slate-300 text-[11px] sm:text-xs">
              Active: <b className="text-rose-400 font-mono">{stats.critical} P0</b>, <b className="text-amber-400 font-mono">{stats.high} P1</b> | Units: <b className="text-emerald-400 font-mono">{stats.activeDispatches}</b> | Filtered: <b className="text-sky-400 font-mono">{stats.falseAlarms}</b>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-slate-400 shrink-0">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              AI Vision: <span className={geminiApiKey ? "text-emerald-400 font-bold" : "text-sky-400 font-bold"}>{geminiApiKey ? "Active" : "Standard"}</span>
            </span>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2.5 sm:gap-3">
          
          {/* Left: 3-Lines Hamburger Menu Button + Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* 3-Lines Hamburger Menu Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="p-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 border border-slate-700/80 text-white shadow-lg transition-all active:scale-95 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <Menu className="w-5 h-5 text-slate-200" />
            </button>

            {/* Brand Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveView('map')}>
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-rose-950/50 border border-slate-700/80 bg-slate-900">
                <img src={resqEmblem} alt="RESQ SINCE 2026" className="w-full h-full object-cover" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#070b14]"></span>
              </div>
              <div className="hidden min-[400px]:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    RESQ<span className="text-rose-500 font-mono">MAP</span>
                  </span>
                  <span className="text-[9px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 bg-slate-800/80 text-slate-300 border border-slate-700 rounded">
                    2026
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: High-Tech Command Center Branding & Status Telemetry */}
          <div className="hidden md:flex items-center gap-3">
            <div 
              onClick={() => setIsDrawerOpen(true)}
              className="cursor-pointer group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#0b1220]/80 border border-white/[0.08] hover:border-slate-600/60 shadow-inner backdrop-blur-md transition-all hover:bg-slate-900/90 active:scale-98"
              title="Click to Open All Command Center Features & Tools"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  {activeView === 'map' && <><span>LIVE TACTICAL MAP</span> <span className="text-slate-400 font-normal">· India Sector</span></>}
                  {activeView === 'reports' && <><span>DISASTER DATABASE</span> <span className="text-slate-400 font-normal">· {stats.total} Reports</span></>}
                  {activeView === 'sos' && <><span>SOS PRIORITY QUEUE</span> <span className="text-rose-400 font-normal">· Triage P0–P3</span></>}
                  {activeView === 'responder' && <><span>FIRST RESPONDER TELEMETRY</span> <span className="text-sky-400 font-normal">· WebRTC</span></>}
                  {activeView === 'volunteers' && <><span>VOLUNTEER MESH HUB</span> <span className="text-indigo-400 font-normal">· Task Grid</span></>}
                  {activeView === 'analytics' && <><span>FLEET ANALYTICS & TRIAGE</span> <span className="text-purple-400 font-normal">· Real-time</span></>}
                </span>
              </div>
              
              <div className="h-3.5 w-px bg-slate-700 mx-0.5"></div>
              
              <span className="text-[10px] text-slate-400 group-hover:text-rose-400 transition-colors flex items-center gap-1 font-mono">
                <span>Menu</span>
                <Menu className="w-3 h-3 text-slate-400 group-hover:text-rose-400" />
              </span>
            </div>
          </div>

          {/* Right Action & System Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Submit SOS Button */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-900/30 border border-rose-400/40 transition-transform active:scale-95 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit SOS</span>
            </button>

            {/* Physical System Status */}
            <button
              onClick={() => setIsResilienceModalOpen(true)}
              title={isOnline ? `Connected to ${activeNodeUrl}` : 'Offline'}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-colors ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-rose-950/60 border-rose-600/40 text-rose-300 hover:bg-rose-900/60'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="max-w-[85px] truncate">
                {isOnline
                  ? (() => { try { const u = new URL(activeNodeUrl); return `${u.hostname}`; } catch { return 'Online'; } })()
                  : 'Offline'
                }
              </span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              title="System Settings"
              className="p-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-[#1f293d] text-slate-300 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── SLIDE-FROM-LEFT MOBILE & TABLET NAVIGATION DRAWER ───────────── */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-[9999] w-[320px] max-w-[85vw] bg-[#0c1220] border-r border-[#1f293d] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1f293d] bg-[#101828] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden shadow">
              <img src={resqEmblem} alt="RESQ" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight">
                  RESQ<span className="text-rose-500 font-mono">MAP</span>
                </span>
                <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                  2026
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {isOnline ? 'System Online' : 'Backend Offline'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="p-4 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Main Dominant Action: Submit Emergency SOS */}
          <div>
            <button
              onClick={() => handleAction(() => setIsReportModalOpen(true))}
              className="w-full p-3 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-950/50 border border-rose-400/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Emergency / Submit SOS</span>
            </button>
          </div>

          {/* Section 1: Command & Operations */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 block">
              Core Operations
            </span>

            {/* 1. Live Map */}
            <button
              onClick={() => handleNavSelect('map')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                activeView === 'map'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeView === 'map' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Live Response Map</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* 2. All Reports */}
            <button
              onClick={() => handleNavSelect('reports')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                activeView === 'reports'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeView === 'reports' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <span>All Disaster Reports</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                {stats.total}
              </span>
            </button>

            {/* 3. SOS Priority Queue */}
            <button
              onClick={() => handleNavSelect('sos')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                activeView === 'sos'
                  ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeView === 'sos' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400'}`}>
                  <Siren className="w-4 h-4" />
                </div>
                <span>SOS Priority Queue</span>
              </div>
              {stats.activeSOS > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {stats.activeSOS}
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* 4. Responder Live Feed */}
            <button
              onClick={() => handleNavSelect('responder')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                activeView === 'responder'
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeView === 'responder' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-sky-400'}`}>
                  <Video className="w-4 h-4" />
                </div>
                <span>First Responder Video</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* 5. Volunteer Hub */}
            <button
              onClick={() => handleNavSelect('volunteers')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                activeView === 'volunteers'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeView === 'volunteers' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400'}`}>
                  <HandHeart className="w-4 h-4" />
                </div>
                <span>Volunteer Mesh Hub</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/40 font-mono text-[10px] font-bold">
                {stats.volunteerTasksAvailable}
              </span>
            </button>

            {/* 6. Fleet Analytics */}
            <button
              onClick={() => handleNavSelect('analytics')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all ${
                activeView === 'analytics'
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${activeView === 'analytics' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-purple-400'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <span>Fleet & Incident Analytics</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Section 2: Relief & Emergency Contacts */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 block">
              Relief & Authorities
            </span>

            {/* SafeHouses */}
            <button
              onClick={() => handleAction(() => setIsSafeHouseModalOpen(true))}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:bg-emerald-950/30 hover:text-emerald-300 transition-colors group border border-transparent hover:border-emerald-600/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-700/40">
                  <Home className="w-4 h-4" />
                </div>
                <span>SafeHouse Shelters</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded">
                Find Bed
              </span>
            </button>

            {/* Emergency Contacts */}
            <button
              onClick={() => handleAction(() => setIsEmergencyContactsOpen(true))}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:bg-rose-950/30 hover:text-rose-300 transition-colors group border border-transparent hover:border-rose-600/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-700/40">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <span>Emergency Helplines</span>
              </div>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded">
                112 / NDRF
              </span>
            </button>

            {/* Gov Dispatch */}
            <button
              onClick={() => handleAction(() => openGovDispatch())}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:bg-amber-950/30 hover:text-amber-300 transition-colors group border border-transparent hover:border-amber-600/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-700/40">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>Gov / NDMA Escalation</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded">
                Dispatch
              </span>
            </button>
          </div>

          {/* Section 3: Physical System & Resilience */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 block">
              System Resilience
            </span>

            {/* Physical System Status */}
            <button
              onClick={() => handleAction(() => setIsResilienceModalOpen(true))}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/30' : 'bg-rose-950 text-rose-400 border border-rose-600/30'}`}>
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <span className="block font-semibold">Backend Hosts</span>
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px] block">
                    {activeNodeUrl}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40' : 'bg-rose-950 text-rose-300 border-rose-600/40'
              }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleAction(() => setIsSettingsModalOpen(true))}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                  <Settings className="w-4 h-4" />
                </div>
                <span>AI & System Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

        </div>

        {/* Drawer Footer Summary */}
        <div className="p-3 border-t border-[#1f293d] bg-[#0a0e17] text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span>Triage: <b className="text-rose-400">{stats.p0Critical} P0</b> · <b className="text-amber-400">{stats.p1High} P1</b></span>
          <span className="text-slate-500">ResQMap v1.0</span>
        </div>
      </aside>
    </>
  );
}



