import React, { useState } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  FileText, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Eye, 
  Truck, 
  ShieldCheck, 
  ShieldAlert, 
  Flame, 
  Waves, 
  Building2, 
  Zap, 
  Mountain, 
  TreePine, 
  CheckCircle2, 
  Ban, 
  Trash2, 
  Download, 
  PlusCircle, 
  LayoutGrid, 
  List,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { HAZARD_CATEGORIES, SEVERITY_CONFIG } from '../data/seedIncidents';

const DEFAULT_FALLBACK_IMAGES = {
  Flood: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
  Fire: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80",
  Structural: "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=800&q=80",
  Landslide: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  Powerline: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80",
  Storm: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=800&q=80",
  Default: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80"
};

function getIncidentImageUrl(inc) {
  if (inc && inc.imageUrl && inc.imageUrl.trim().length > 5) {
    // Sanitize any legacy dog photo URLs
    if (inc.imageUrl.includes('photo-1599839575945-a9e5af0c3fa5')) {
      return DEFAULT_FALLBACK_IMAGES.Fire;
    }
    return inc.imageUrl;
  }
  const cat = (inc?.hazardCategory || '').toLowerCase();
  if (cat.includes('flood') || cat.includes('water')) return DEFAULT_FALLBACK_IMAGES.Flood;
  if (cat.includes('fire') || cat.includes('wildfire') || cat.includes('smoke')) return DEFAULT_FALLBACK_IMAGES.Fire;
  if (cat.includes('structural') || cat.includes('building') || cat.includes('earthquake') || cat.includes('collapse')) return DEFAULT_FALLBACK_IMAGES.Structural;
  if (cat.includes('landslide') || cat.includes('mudslide') || cat.includes('slope')) return DEFAULT_FALLBACK_IMAGES.Landslide;
  if (cat.includes('powerline') || cat.includes('electrical') || cat.includes('wire')) return DEFAULT_FALLBACK_IMAGES.Powerline;
  if (cat.includes('storm') || cat.includes('cyclone') || cat.includes('rain')) return DEFAULT_FALLBACK_IMAGES.Storm;
  return DEFAULT_FALLBACK_IMAGES.Default;
}

function formatSafeTime(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AllReportsView() {
  const { 
    incidents, 
    setSelectedIncident, 
    setActiveView, 
    setActiveResponderIncident, 
    deleteIncident,
    updateIncidentStatus,
    setIsReportModalOpen,
    filters,
    setFilters
  } = useDisaster();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'severity' | 'authenticity'

  // Filter & search logic
  const filteredList = incidents.filter(inc => {
    if (filters.hazardCategory !== 'ALL' && inc.hazardCategory !== filters.hazardCategory) {
      return false;
    }
    if (filters.severity !== 'ALL' && inc.severity !== filters.severity) {
      return false;
    }
    if (filters.status !== 'ALL' && inc.status !== filters.status) {
      return false;
    }
    if (filters.verifiedOnly && (!inc.isRealDisaster || inc.status === 'FLAGGED_FALSE_ALARM')) {
      return false;
    }
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = inc.title?.toLowerCase().includes(q);
      const matchAddress = inc.address?.toLowerCase().includes(q);
      const matchId = inc.id?.toLowerCase().includes(q);
      const matchCategory = inc.hazardCategory?.toLowerCase().includes(q);
      const matchReporter = inc.reporterName?.toLowerCase().includes(q);
      if (!matchTitle && !matchAddress && !matchId && !matchCategory && !matchReporter) return false;
    }
    return true;
  });

  // Sort logic
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === 'severity') {
      const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (rank[b.severity] || 0) - (rank[a.severity] || 0);
    }
    if (sortBy === 'authenticity') {
      return (b.authenticityScore || 0) - (a.authenticityScore || 0);
    }
    return 0;
  });

  // Export reports to JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `resqmap-disaster-reports-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleLocateOnMap = (inc) => {
    setSelectedIncident(inc);
    setActiveView('map');
  };

  const handleLaunchLiveFeed = (inc) => {
    setActiveResponderIncident(inc);
    setActiveView('responder');
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search / Filter Controls */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/40">
                <FileText className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-bold text-rose-400 uppercase tracking-widest">
                Citizen Disaster Damage Directory
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white mt-1">
              All Incident Reports & Triage Database
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing <b className="text-white font-mono">{sortedList.length}</b> of <b className="text-slate-300 font-mono">{incidents.length}</b> total geotagged emergency submissions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center gap-1.5 border border-rose-400/40 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New SOS</span>
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-[#1f293d]">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search title, address, ID..."
              value={filters.searchQuery}
              onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-slate-900 text-xs text-white pl-8 pr-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Hazard Category Filter */}
          <div>
            <select
              value={filters.hazardCategory}
              onChange={e => setFilters(prev => ({ ...prev, hazardCategory: e.target.value }))}
              className="w-full bg-slate-900 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Hazard Categories</option>
              {HAZARD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={filters.severity}
              onChange={e => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full bg-slate-900 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Severity Levels</option>
              <option value="CRITICAL">🔴 Critical Severity Only</option>
              <option value="HIGH">🟠 High Severity Only</option>
              <option value="MEDIUM">🟡 Medium Severity Only</option>
              <option value="LOW">🔵 Low Severity Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full bg-slate-900 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="newest">🕒 Sort: Most Recent First</option>
              <option value="severity">⚠️ Sort: Highest Severity First</option>
              <option value="authenticity">🛡️ Sort: Highest Authenticity Score</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between bg-slate-900 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View of Incidents */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedList.map(inc => {
            const sevConf = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.MEDIUM;

            return (
              <div
                key={inc.id}
                className="bg-[#111827] border border-[#1f293d] hover:border-slate-600 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Photo Banner */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={getIncidentImageUrl(inc)}
                      alt={inc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_FALLBACK_IMAGES.Default;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                    {/* Category & Severity Badges */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20">
                      {inc.hazardCategory}
                    </div>

                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${sevConf.badge}`}>
                      {inc.severity}
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span className="font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                        {inc.id}
                      </span>
                      <span>
                        {formatSafeTime(inc.createdAt || inc.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-rose-400 transition-colors">
                        {inc.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        {inc.address}
                      </p>
                    </div>

                    {/* Authenticity Check Pill */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400">Authenticity:</span>
                      {inc.isRealDisaster ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {inc.authenticityScore.toFixed(1)}% Real
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                          <Ban className="w-3.5 h-3.5" />
                          Flagged False Alarm
                        </span>
                      )}
                    </div>

                    {/* Visual Features Snippet */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Visual Evidence ({inc.visualFeatures?.length || 0} factors):
                      </span>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        {inc.visualFeatures?.[0] || inc.damageAssessment}
                      </p>
                    </div>

                    {/* Trapped Urgency tags */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {inc.trappedCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/40 font-bold">
                          ⚠️ {inc.trappedCount} Trapped
                        </span>
                      )}
                      {inc.needsBoat && (
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-600/40 font-semibold">
                          🚤 Boat Required
                        </span>
                      )}
                      {inc.needsMedical && (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/40 font-semibold">
                          🏥 Medical Urgency
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        inc.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                        inc.status === 'ON_SCENE' ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30' :
                        inc.status === 'EN_ROUTE' ? 'bg-sky-950 text-sky-300 border border-sky-500/30' :
                        inc.status === 'DISPATCHED' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-[#0d131f] border-t border-[#1f293d] grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedIncident(inc)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => handleLocateOnMap(inc)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>On Map</span>
                  </button>

                  <button
                    onClick={() => handleLaunchLiveFeed(inc)}
                    className="py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-md transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Feed</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Tactical Spreadsheet Table View */
        <div className="bg-[#111827] border border-[#1f293d] rounded-2xl overflow-hidden shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-[#1f293d] text-[11px] uppercase font-bold text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Photo Preview</th>
                <th className="py-3 px-4">Hazard Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Authenticity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]">
              {sortedList.map(inc => {
                const sevConf = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.MEDIUM;
                return (
                  <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {inc.id}
                    </td>
                    <td className="py-3 px-4">
                      <img
                        src={inc.imageUrl}
                        alt={inc.title}
                        className="w-12 h-10 object-cover rounded-lg border border-slate-700 bg-black"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {inc.hazardCategory}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${sevConf.badge}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {inc.address}
                    </td>
                    <td className="py-3 px-4">
                      {inc.isRealDisaster ? (
                        <span className="text-emerald-400 font-bold font-mono">
                          ✓ {inc.authenticityScore.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold">
                          ✗ False Alarm
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold font-mono uppercase text-slate-300">
                        {inc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg"
                        title="Inspect"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLocateOnMap(inc)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg"
                        title="Locate on Map"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleLaunchLiveFeed(inc)}
                        className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                        title="Open Live Feed"
                      >
                        <Truck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteIncident(inc.id)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-rose-200 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
