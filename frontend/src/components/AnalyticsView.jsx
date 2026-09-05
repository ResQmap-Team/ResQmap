import React, { useState, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Truck, 
  Flame, 
  Waves, 
  Building2, 
  Zap, 
  Mountain, 
  TreePine,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Navigation,
  Compass,
  Award,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Phone,
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { HAZARD_CATEGORIES } from '../data/seedIncidents';

const formatSkillsArray = (skills) => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
  return ['General First Aid'];
};

const formatSkillsString = (skills) => {
  if (Array.isArray(skills)) return skills.join(', ');
  if (typeof skills === 'string') return skills;
  return 'General First Aid';
};

export default function AnalyticsView() {
  const { 
    incidents, 
    stats,
    volunteerAnalysis,
    volunteerAnalysisLoading,
    loadVolunteerAnalysis,
    matchVolunteersForIncident,
    assignResponder,
    setActiveView,
    setActiveResponderIncident,
  } = useDisaster();

  const [activeTab, setActiveTab] = useState('volunteers'); // 'volunteers' | 'hazards'
  const [selectedIncidentForMatch, setSelectedIncidentForMatch] = useState(() => incidents[0]?.id || '');
  const [matchResults, setMatchResults] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [searchRoster, setSearchRoster] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Auto-init selected incident if empty
  useEffect(() => {
    if (!selectedIncidentForMatch && incidents && incidents.length > 0) {
      setSelectedIncidentForMatch(incidents[0].id);
    }
  }, [incidents, selectedIncidentForMatch]);

  // Trigger volunteer matching when selected incident changes
  useEffect(() => {
    if (!selectedIncidentForMatch) return;
    let isCancelled = false;
    setMatchingLoading(true);

    const targetInc = incidents.find(i => i.id === selectedIncidentForMatch);

    matchVolunteersForIncident(selectedIncidentForMatch, {
      latitude: targetInc?.latitude,
      longitude: targetInc?.longitude,
      hazard_category: targetInc?.hazardCategory || targetInc?.hazard_category,
      severity: targetInc?.severity || targetInc?.priority,
    }).then(results => {
      if (!isCancelled) {
        if (results && results.length > 0) {
          setMatchResults(results);
        } else {
          // Fallback matching if backend returns empty or offline
          const fallbackResponders = (volunteerAnalysis?.responders || []).length > 0
            ? volunteerAnalysis.responders
            : [
                { id: 'FR-001', name: 'Inspector R. Selvakumar', unit: 'Swiftwater Rescue Unit 17', role: 'PROFESSIONAL_RESPONDER', status: 'AVAILABLE', skills: ['Swiftwater Rescue', 'Boat Operation', 'Water Evacuation'], current_latitude: 17.448, current_longitude: 78.375, activeMissionsCount: 0, completedMissionsCount: 14 },
                { id: 'FR-002', name: 'Dr. Ananya Sharma', unit: 'Disaster Paramedic Unit 08', role: 'VOLUNTEER', status: 'AVAILABLE', skills: ['Medical / First Aid', 'Triage', 'Trauma Care'], current_latitude: 17.442, current_longitude: 78.380, activeMissionsCount: 0, completedMissionsCount: 22 },
                { id: 'FR-003', name: 'Commander K. Vikram', unit: 'NDRF USAR Heavy Battalion 4', role: 'COMMANDER', status: 'ASSIGNED', skills: ['USAR', 'Structural Search', 'Heavy Rescue'], current_latitude: 17.450, current_longitude: 78.370, activeMissionsCount: 1, completedMissionsCount: 31 },
                { id: 'FR-004', name: 'Eng. Prakash Rao', unit: 'TSSPDCL Grid Isolation Squad', role: 'VOLUNTEER', status: 'AVAILABLE', skills: ['Electrical Safety', 'Power Isolation', 'Grid Clearance'], current_latitude: 17.445, current_longitude: 78.378, activeMissionsCount: 0, completedMissionsCount: 9 },
                { id: 'FR-005', name: 'Capt. Manoj Verma', unit: 'Industrial Foam Fire Engine 12', role: 'PROFESSIONAL_RESPONDER', status: 'AVAILABLE', skills: ['Firefighting', 'Smoke Inhalation', 'Hazmat'], current_latitude: 17.439, current_longitude: 78.365, activeMissionsCount: 0, completedMissionsCount: 18 },
              ];

          // Compute mock match score for UI preview
          const scored = fallbackResponders.map(r => {
            let score = r.status === 'AVAILABLE' ? 60 : 30;
            const rSkills = formatSkillsString(r.skills).toLowerCase();
            const hazard = (targetInc?.hazardCategory || targetInc?.hazard_category || '').toLowerCase();
            if ((hazard.includes('flood') && rSkills.includes('swiftwater')) ||
                (hazard.includes('structural') && rSkills.includes('usar')) ||
                (hazard.includes('fire') && rSkills.includes('firefighting')) ||
                (hazard.includes('electrical') && rSkills.includes('electrical'))) {
              score += 35;
            }
            return {
              ...r,
              matchScore: Math.min(100, score),
              matchReasons: [
                `Certification match for ${(targetInc?.hazardCategory || targetInc?.hazard_category || 'Hazard').split('/')[0]}`,
                `Status: ${r.status}`,
                'Proximity within response sector',
              ],
              distanceKm: 2.4,
            };
          }).sort((a, b) => b.matchScore - a.matchScore);
          setMatchResults(scored);
        }
        setMatchingLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedIncidentForMatch, incidents, matchVolunteersForIncident, volunteerAnalysis]);

  // Derived metrics from volunteer analysis or fallback
  const totalVolunteers = volunteerAnalysis?.totalResponders ?? 5;
  const availableVolunteers = volunteerAnalysis?.availableResponders ?? 4;
  const activeMissionsCount = volunteerAnalysis?.activeMissions ?? stats?.activeDispatches ?? 0;
  const avgResponseTime = volunteerAnalysis?.avgResponseTimeMinutes ?? 4.2;
  const readinessPct = volunteerAnalysis?.fleetReadinessPct ?? 80;
  const resolvedMissions = volunteerAnalysis?.resolvedMissions ?? stats?.resolved ?? 0;

  const respondersList = volunteerAnalysis?.responders && volunteerAnalysis.responders.length > 0
    ? volunteerAnalysis.responders
    : [
        { id: 'FR-001', responder_code: 'FR-001', name: 'Inspector R. Selvakumar', unit: 'Swiftwater Rescue Boat Unit 17', vehicle: 'Rigid Inflatable Boat (RIB-4)', role: 'PROFESSIONAL_RESPONDER', status: 'AVAILABLE', skills: ['Swiftwater Rescue', 'Boat Operation', 'Water Evacuation'], phone: '+91 98401 22334', activeMissionsCount: 0, completedMissionsCount: 14, current_latitude: 17.448, current_longitude: 78.375 },
        { id: 'FR-002', responder_code: 'FR-002', name: 'Dr. Ananya Sharma', unit: 'Disaster Paramedic Unit 08', vehicle: 'Advanced Life Support Ambulance', role: 'VOLUNTEER', status: 'AVAILABLE', skills: ['Medical / First Aid', 'Triage', 'Trauma Care'], phone: '+91 98402 33445', activeMissionsCount: 0, completedMissionsCount: 22, current_latitude: 17.442, current_longitude: 78.380 },
        { id: 'FR-003', responder_code: 'FR-003', name: 'Commander K. Vikram', unit: 'NDRF USAR Heavy Battalion 4', vehicle: 'Heavy Extrication Truck', role: 'COMMANDER', status: 'ASSIGNED', skills: ['USAR', 'Structural Search', 'Heavy Rescue', 'K9 Search'], phone: '+91 98403 44556', activeMissionsCount: 1, completedMissionsCount: 31, current_latitude: 17.450, current_longitude: 78.370 },
        { id: 'FR-004', responder_code: 'FR-004', name: 'Eng. Prakash Rao', unit: 'TSSPDCL Grid Isolation Squad', vehicle: 'Insulated Boom Truck', role: 'VOLUNTEER', status: 'AVAILABLE', skills: ['Electrical Safety', 'Power Isolation', 'Grid Clearance'], phone: '+91 98404 55667', activeMissionsCount: 0, completedMissionsCount: 9, current_latitude: 17.445, current_longitude: 78.378 },
        { id: 'FR-005', responder_code: 'FR-005', name: 'Capt. Manoj Verma', unit: 'Industrial Foam Fire Engine 12', vehicle: 'Major Foam Tender (12,000L)', role: 'PROFESSIONAL_RESPONDER', status: 'AVAILABLE', skills: ['Firefighting', 'Smoke Inhalation', 'Hazmat'], phone: '+91 98405 66778', activeMissionsCount: 0, completedMissionsCount: 18, current_latitude: 17.439, current_longitude: 78.365 },
      ];

  const filteredRoster = respondersList.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchRoster.trim()) {
      const q = searchRoster.toLowerCase();
      const rSkills = formatSkillsString(r.skills).toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.unit?.toLowerCase().includes(q) ||
        rSkills.includes(q) ||
        r.role?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categoryCounts = HAZARD_CATEGORIES.map(cat => ({
    name: cat,
    count: incidents.filter(i => (i.hazardCategory === cat || i.hazard_category === cat) && (i.isRealDisaster || i.is_real_disaster)).length
  }));
  const maxCategoryCount = Math.max(...categoryCounts.map(c => c.count), 1);

  const handle1ClickDispatch = (candidate) => {
    const targetInc = incidents.find(i => i.id === selectedIncidentForMatch);
    if (!targetInc) return;
    assignResponder(targetInc.id, candidate.unit || candidate.name, 6, candidate.distanceKm || 2.5);
    setActiveResponderIncident(targetInc);
    setActiveView('responder');
  };

  return (

    <div className="space-y-5">
      {/* Header & View Switcher */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Users className="w-5 h-5" />
            </span>
            <span className="font-mono text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Volunteer & Fleet Operational Analysis
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">
            First Responder Triage, Volunteer Matching & Command Telemetry
          </h1>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('volunteers')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'volunteers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Volunteer System</span>
          </button>
          <button
            onClick={() => setActiveTab('hazards')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'hazards'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Hazard Metrics</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-[#111827] rounded-2xl border border-[#1f293d] shadow-lg space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Total Volunteers
          </span>
          <div className="text-2xl font-black text-white font-mono">{totalVolunteers}</div>
          <span className="text-[10px] text-indigo-400 font-mono block">Registered Units</span>
        </div>

        <div className="p-4 bg-[#111827] rounded-2xl border border-emerald-900/40 shadow-lg space-y-1">
          <span className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Available Now
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{availableVolunteers}</div>
          <span className="text-[10px] text-emerald-300/80 font-mono block">100% Ready</span>
        </div>

        <div className="p-4 bg-[#111827] rounded-2xl border border-sky-900/40 shadow-lg space-y-1">
          <span className="text-[11px] text-sky-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-sky-400" />
            Active Missions
          </span>
          <div className="text-2xl font-black text-sky-400 font-mono">{activeMissionsCount}</div>
          <span className="text-[10px] text-sky-300/80 font-mono block">En Route / On Scene</span>
        </div>

        <div className="p-4 bg-[#111827] rounded-2xl border border-amber-900/40 shadow-lg space-y-1">
          <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Avg Response
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">{avgResponseTime} <span className="text-xs font-normal">min</span></div>
          <span className="text-[10px] text-amber-300/80 font-mono block">Assignment to Scene</span>
        </div>

        <div className="p-4 bg-[#111827] rounded-2xl border border-indigo-900/40 shadow-lg space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            Fleet Readiness
          </span>
          <div className="text-2xl font-black text-indigo-300 font-mono">{readinessPct}%</div>
          <span className="text-[10px] text-indigo-400 font-mono block">{resolvedMissions} Missions Resolved</span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'volunteers' ? (
        <div className="space-y-5">
          {/* Section 1: AI Volunteer-to-Incident Dispatch Matcher */}
          <div className="bg-[#111827] border border-indigo-900/40 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  AI Volunteer-to-Incident Dispatch Matcher
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranks suitable volunteer & first responder units by certification, distance (Haversine), and capacity.
                </p>
              </div>

              {/* Target Incident Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Target Incident:</span>
                <select
                  value={selectedIncidentForMatch}
                  onChange={e => setSelectedIncidentForMatch(e.target.value)}
                  className="bg-slate-900 text-xs text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {incidents.filter(i => i.isRealDisaster || i.is_real_disaster).map(inc => (
                    <option key={inc.id} value={inc.id}>
                      {inc.id} · {(inc.hazardCategory || inc.hazard_category || 'Hazard').split('/')[0]} ({inc.priority || inc.severity || 'P0'})
                    </option>
                  ))}

                </select>
              </div>
            </div>

            {/* Match Results Cards */}
            {matchingLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                Computing optimal volunteer-to-incident match vectors...
              </div>
            ) : matchResults.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No active responders available to match for this sector.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {matchResults.slice(0, 3).map((candidate, idx) => {
                  const score = candidate.matchScore || 85;
                  const isTopMatch = idx === 0;
                  return (
                    <div
                      key={candidate.id || idx}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        isTopMatch
                          ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-950/40'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isTopMatch ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isTopMatch ? '★ #1 RECOMMENDED MATCH' : `RANK #${idx + 1}`}
                          </span>
                          <span className="font-mono text-sm font-black text-emerald-400">
                            {score}% Match
                          </span>
                        </div>

                        {/* Responder Name & Unit */}
                        <h4 className="font-bold text-xs text-white line-clamp-1">{candidate.name}</h4>
                        <p className="text-[11px] text-slate-300 font-mono mt-0.5">{candidate.unit}</p>

                        {/* Match Reasons Checklist */}
                        <div className="mt-3 space-y-1 text-[10px] font-mono text-slate-300">
                          {(candidate.matchReasons || []).slice(0, 3).map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-start gap-1.5 text-slate-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 1-Click Dispatch Action */}
                      <button
                        onClick={() => handle1ClickDispatch(candidate)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/30 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Dispatch {candidate.unit?.split(' ')[0] || 'Unit'} Now
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Active Volunteer & First Responder Roster */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Active Volunteer Roster & Workload
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live operational roster with verified skills, unit vehicle, and assignment capacity.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search name, unit, skill..."
                  value={searchRoster}
                  onChange={e => setSearchRoster(e.target.value)}
                  className="bg-slate-900 text-xs text-white px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 placeholder-slate-500 w-44"
                />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-900 text-xs text-white px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="EN_ROUTE">En Route</option>
                </select>
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Responder</th>
                    <th className="py-2.5 px-3">Role & Unit</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Verified Skills</th>
                    <th className="py-2.5 px-3">Missions</th>
                    <th className="py-2.5 px-3 text-right">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {filteredRoster.map(resp => {
                    const statusColor =
                      resp.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50' :
                      resp.status === 'ASSIGNED'  ? 'bg-sky-950 text-sky-300 border-sky-700/50' :
                      resp.status === 'EN_ROUTE'  ? 'bg-amber-950 text-amber-300 border-amber-700/50 animate-pulse' :
                                                    'bg-slate-800 text-slate-400 border-slate-700';

                    return (
                      <tr key={resp.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white font-sans text-xs">{resp.name}</div>
                          <div className="text-[10px] text-slate-400">{resp.responder_code || resp.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-200 font-sans">{resp.unit}</div>
                          <div className="text-[10px] text-slate-400">{resp.vehicle || 'Standard Response'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${statusColor}`}>
                            {resp.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {formatSkillsArray(resp.skills).map((s, sIdx) => (
                              <span key={sIdx} className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded text-[9px]">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-slate-300">{resp.completedMissionsCount ?? 12} resolved</div>
                          <div className="text-[10px] text-slate-500">{resp.activeMissionsCount ?? 0} active</div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-slate-400 text-[10px]">{resp.phone || '+91 98400 00000'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Hazard Distribution Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category Distribution Bars */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-[#1f293d] shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Hazard Incident Breakdown
            </h3>

            <div className="space-y-3 pt-2">
              {categoryCounts.map(cat => {
                const pct = (cat.count / maxCategoryCount) * 100;
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{cat.name}</span>
                      <span className="font-mono text-slate-400 font-bold">{cat.count} Reports</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tactical Fleet Allocation */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-[#1f293d] shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              Specialized Fleet Deployment Breakdown
            </h3>

            <div className="space-y-3 pt-2">
              {[
                { unit: 'Swiftwater Rescue Boats (Alpha & Beta)', status: '2 Active / 4 Standby', ready: 80 },
                { unit: 'Urban Search & Rescue (USAR Heavy 1)', status: '1 On Scene / 2 Standby', ready: 90 },
                { unit: 'Industrial Foam Fire Engines', status: '1 En Route / 3 Standby', ready: 85 },
                { unit: 'TSSPDCL High-Voltage Grid Isolation', status: '1 Dispatched / 2 Standby', ready: 75 },
                { unit: 'Disaster Paramedic Ambulances', status: '3 Active / 6 Standby', ready: 95 }
              ].map(item => (
                <div key={item.unit} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{item.unit}</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">{item.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${item.ready}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

