import React, { useState } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  Users, 
  HandHeart, 
  Award, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Navigation, 
  Crosshair, 
  AlertTriangle, 
  Truck, 
  HeartPulse, 
  Utensils, 
  Droplets, 
  Camera, 
  Package, 
  Sparkles, 
  Edit3, 
  Save, 
  ChevronRight, 
  Check, 
  Eye, 
  ExternalLink,
  Flame,
  Info,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VOLUNTEER_SKILLS } from '../data/volunteerTasks';
import { calculateDistanceKm, getDirectionsUrl } from '../services/safeHouseService';

export default function VolunteerHub() {
  const { 
    volunteerProfile, 
    updateVolunteerProfile, 
    volunteerStatus, 
    updateVolunteerStatus, 
    volunteerTasks, 
    volunteerImpact, 
    acceptVolunteerTask, 
    completeVolunteerTask,
    setSelectedIncident,
    setActiveView
  } = useDisaster();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(volunteerProfile);
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'ACTIVE' | 'COMPLETED'
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'profile' | 'history'

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateVolunteerProfile(profileForm);
    setIsEditingProfile(false);
  };

  const handleSkillToggle = (skillName) => {
    const currentSkills = profileForm.skills || [];
    if (currentSkills.includes(skillName)) {
      setProfileForm({
        ...profileForm,
        skills: currentSkills.filter(s => s !== skillName)
      });
    } else {
      setProfileForm({
        ...profileForm,
        skills: [...currentSkills, skillName]
      });
    }
  };

  const handleLocateVolunteer = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          setProfileForm(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            locationName: `Live GPS Location (${lat}, ${lng})`
          }));
        },
        err => console.warn("Geolocation error:", err)
      );
    }
  };

  // Find active task if any
  const activeTask = volunteerTasks.find(t => t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS');

  // Filter tasks
  const filteredTasks = volunteerTasks.filter(t => {
    if (taskFilter === 'AVAILABLE') return t.status === 'AVAILABLE';
    if (taskFilter === 'ACTIVE') return t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS';
    if (taskFilter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Prominent Volunteer Header & Status Hub */}
      <div className="bg-gradient-to-r from-[#111827] via-[#162032] to-[#111827] rounded-2xl border border-[#1f293d] p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Volunteer Avatar & Badges */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 shadow-xl shadow-indigo-950/60 border border-sky-400/30">
              <HandHeart className="w-7 h-7 text-white" />
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#111827] ${
                volunteerStatus === 'AVAILABLE' ? 'bg-emerald-500' :
                volunteerStatus === 'BUSY' ? 'bg-amber-500' : 'bg-slate-500'
              }`}></span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{volunteerProfile.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {volunteerImpact.rankTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  ⭐ {volunteerImpact.badgeLevel} TIER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>📍 {volunteerProfile.locationName}</span>
                <span>•</span>
                <span>📞 {volunteerProfile.phone}</span>
              </p>
            </div>
          </div>

          {/* Prominent Status Selector */}
          <div className="flex items-center gap-2 bg-[#0a0e17] p-1.5 rounded-2xl border border-[#1f293d] self-start lg:self-auto shadow-inner">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">
              My Status:
            </span>

            <button
              onClick={() => updateVolunteerStatus('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                volunteerStatus === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Available</span>
            </button>

            <button
              onClick={() => updateVolunteerStatus('BUSY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                volunteerStatus === 'BUSY'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 ring-1 ring-amber-400'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>On Task</span>
            </button>

            <button
              onClick={() => updateVolunteerStatus('OFFLINE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                volunteerStatus === 'OFFLINE'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>Offline</span>
            </button>
          </div>

        </div>

        {/* Impact Counters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1f293d]">
          <div className="p-3 bg-[#0a0e17]/80 rounded-xl border border-indigo-900/30">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">ResQMap Impact Score</span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">
              {volunteerImpact.score} <span className="text-xs text-indigo-400 font-sans font-normal">pts</span>
            </span>
          </div>

          <div className="p-3 bg-[#0a0e17]/80 rounded-xl border border-emerald-900/30">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Tasks Completed</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
              {volunteerImpact.tasksCompleted}
            </span>
          </div>

          <div className="p-3 bg-[#0a0e17]/80 rounded-xl border border-sky-900/30">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Citizens Assisted</span>
            <span className="text-2xl font-black font-mono text-sky-400 mt-1 block">
              {volunteerImpact.peopleAssisted}+
            </span>
          </div>

          <div className="p-3 bg-[#0a0e17]/80 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Assignment</span>
            <span className="text-xs font-bold text-white truncate mt-2 block">
              {activeTask ? `Active: ${activeTask.title.substring(0, 24)}...` : "None (Ready for Tasks)"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Mandatory Volunteer Safety Protocol Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/40 text-amber-200 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-amber-300 uppercase tracking-wider text-sm flex items-center gap-1.5">
              <span>⚠️ Citizen Volunteer Safety Protocol</span>
            </h4>
            <p className="text-slate-300 leading-relaxed">
              • <b>Do NOT enter unsafe zones</b> or active collapse rubble without structural shoring equipment.
              <br />
              • <b>Follow official first responder instructions</b> (Police, Fire & NDRF commanders).
              <br />
              • <b>Stay away from downed powerlines</b>, sparking utility poles, and moving flood currents.
              <br />
              • <b>Only accept tasks matching your certified capabilities</b> and personal safety equipment.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Body Tabs */}
      <div className="flex items-center justify-between border-b border-[#1f293d] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>AI Task Recommendations ({volunteerTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>My Skills & Equipment</span>
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="flex items-center gap-1.5 text-xs bg-[#111827] p-1 rounded-xl border border-[#1f293d]">
            {['ALL', 'AVAILABLE', 'ACTIVE', 'COMPLETED'].map(f => (
              <button
                key={f}
                onClick={() => setTaskFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                  taskFilter === f
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: INTELLIGENT TASK RECOMMENDATIONS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          
          {/* Active Task In-Progress Highlight */}
          {activeTask && (
            <div className="bg-gradient-to-br from-indigo-950/80 to-[#111827] border-2 border-indigo-500/60 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                    CURRENT ACTIVE ASSIGNMENT
                  </span>
                  <h3 className="text-base font-black text-white">{activeTask.title}</h3>
                  <p className="text-xs text-slate-300">{activeTask.description}</p>
                </div>

                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-xs">
                  +{activeTask.impactPoints} pts
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-900/40">
                <button
                  onClick={() => completeVolunteerTask(activeTask.id)}
                  className="py-2 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Task Complete (+{activeTask.impactPoints} Score)</span>
                </button>

                <a
                  href={getDirectionsUrl(activeTask.latitude, activeTask.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Navigate in Google Maps</span>
                </a>
              </div>
            </div>
          )}

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map(task => {
              const distance = calculateDistanceKm(
                volunteerProfile.latitude, 
                volunteerProfile.longitude, 
                task.latitude, 
                task.longitude
              );
              const isAccepted = task.status === 'ACCEPTED' || task.status === 'IN_PROGRESS';
              const isCompleted = task.status === 'COMPLETED';

              return (
                <div
                  key={task.id}
                  className={`bg-[#111827] rounded-2xl p-5 border transition-all hover:border-slate-600 shadow-xl flex flex-col justify-between ${
                    isCompleted ? 'border-emerald-900/30 opacity-70 bg-emerald-950/10' :
                    isAccepted ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-[#1f293d]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            task.priority === 'P0' ? 'bg-rose-600 text-white' :
                            task.priority === 'P1' ? 'bg-orange-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            {task.priority} Urgency
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {task.incidentId}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-sm mt-1 leading-snug">
                          {task.title}
                        </h4>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-600/30 font-mono font-bold text-xs shrink-0">
                        +{task.impactPoints} pts
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {task.description}
                    </p>

                    {/* Meta: Distance, ETA, People Assisted */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#0a0e17] border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Distance</span>
                        <span className="font-mono font-bold text-emerald-400">{distance} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Est. Time</span>
                        <span className="font-mono font-bold text-slate-200">{task.estimatedDuration}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Civilian Aid</span>
                        <span className="font-mono font-bold text-sky-400">~{task.peopleAffected} people</span>
                      </div>
                    </div>

                    {/* Required Skills & Equipment */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Required Skills & Gear:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {task.requiredSkills.map(skill => {
                          const hasSkill = volunteerProfile.skills?.includes(skill);
                          return (
                            <span
                              key={skill}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                hasSkill 
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40' 
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {hasSkill && <span>✓</span>}
                              <span>{skill}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-800">
                    {isCompleted ? (
                      <span className="w-full py-2 bg-emerald-950 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed (+{task.impactPoints} Score Earned)</span>
                      </span>
                    ) : isAccepted ? (
                      <button
                        onClick={() => completeVolunteerTask(task.id)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark as Done</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => acceptVolunteerTask(task.id)}
                        disabled={volunteerStatus === 'OFFLINE'}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-950/40 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <HandHeart className="w-4 h-4" />
                        <span>Accept Mission</span>
                      </button>
                    )}

                    <a
                      href={getDirectionsUrl(task.latitude, task.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
                      title="Navigate"
                    >
                      <Navigation className="w-4 h-4 text-sky-400" />
                    </a>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: PROFILE & SKILLS CONFIGURATION */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-[#111827] rounded-2xl p-6 border border-[#1f293d] space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-extrabold text-white text-base">Volunteer Capability Matrix</h3>
              <p className="text-xs text-slate-400">Configure your ground skills, transport, and equipment for tailored mission matching.</p>
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-[#0a0e17] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-[#0a0e17] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Location with Live GPS button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 block">Volunteer Base Location</label>
              <button
                type="button"
                onClick={handleLocateVolunteer}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Crosshair className="w-3.5 h-3.5" /> Update Live GPS
              </button>
            </div>
            <input
              type="text"
              value={profileForm.locationName}
              onChange={e => setProfileForm({ ...profileForm, locationName: e.target.value })}
              className="w-full bg-[#0a0e17] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Skills Multi-Select Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Trained Skills & Certifications (Click to Toggle)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {VOLUNTEER_SKILLS.map(skill => {
                const isSelected = profileForm.skills?.includes(skill.id);
                return (
                  <div
                    key={skill.id}
                    onClick={() => handleSkillToggle(skill.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                        : 'bg-[#0a0e17] border-[#1f293d] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center text-xs font-bold border ${
                      isSelected ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                    <span className="text-xs font-semibold">{skill.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle & Equipment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Available</label>
              <input
                type="text"
                value={profileForm.vehicleType}
                onChange={e => setProfileForm({ ...profileForm, vehicleType: e.target.value })}
                placeholder="e.g. 4x4 SUV, Pickup Truck, Motorcycle, None"
                className="w-full bg-[#0a0e17] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Equipment on Hand</label>
              <input
                type="text"
                value={Array.isArray(profileForm.equipment) ? profileForm.equipment.join(', ') : profileForm.equipment}
                onChange={e => setProfileForm({ ...profileForm, equipment: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="e.g. First Aid Kit, Rope, Flashlight, Water Cans"
                className="w-full bg-[#0a0e17] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save & Update Mission Matches</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
