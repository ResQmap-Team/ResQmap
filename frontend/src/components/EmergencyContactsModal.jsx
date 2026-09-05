import React, { useState, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  X, 
  Phone, 
  PhoneCall, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  Flame, 
  HeartPulse, 
  Radio, 
  LifeBuoy, 
  Building2, 
  Users, 
  Search, 
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Server,
  Send
} from 'lucide-react';
import { CONTACT_CATEGORIES } from '../data/emergencyContacts';

// Map icon name string to Lucide component
function getEmergencyIcon(iconName, className = "w-5 h-5") {
  switch (iconName) {
    case 'ShieldAlert': return <ShieldAlert className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Flame': return <Flame className={className} />;
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'Radio': return <Radio className={className} />;
    case 'LifeBuoy': return <LifeBuoy className={className} />;
    case 'Building2': return <Building2 className={className} />;
    case 'Users': return <Users className={className} />;
    default: return <Phone className={className} />;
  }
}

export default function EmergencyContactsModal() {
  const { 
    isEmergencyContactsOpen, 
    setIsEmergencyContactsOpen, 
    emergencyContacts,
    setIsSettingsModalOpen,
    openGovDispatch,
    selectedIncident,
    incidents
  } = useDisaster();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [callToast, setCallToast] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEmergencyContactsOpen) {
        setIsEmergencyContactsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmergencyContactsOpen, setIsEmergencyContactsOpen]);

  if (!isEmergencyContactsOpen) return null;

  const handleCopy = (id, number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(number);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCall = (contact) => {
    // Show visual confirmation on desktop while tel: triggers dialer on mobile
    setCallToast(`Connecting to ${contact.name} (${contact.number})...`);
    setTimeout(() => setCallToast(null), 3000);
  };

  const filteredContacts = (emergencyContacts || []).filter(c => {
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchNum = c.number?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchNum) return false;
    }
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-contacts-title"
    >
      <div className="relative w-full max-w-4xl bg-[#0d131f] border border-rose-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[90vh]">
        
        {/* Top Priority Emergency Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f293d] bg-gradient-to-r from-rose-950/90 via-[#111827] to-rose-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/50 shadow-lg shadow-rose-950/50">
              <PhoneCall className="w-6 h-6 animate-pulse text-rose-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="emergency-contacts-title" className="font-black text-white text-base sm:text-lg tracking-tight">
                  Emergency Helplines & Control Rooms
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                  24x7 Priority
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Immediate dispatch lines for police, fire, swiftwater rescue, medical trauma, and disaster cells.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEmergencyContactsOpen(false)}
            aria-label="Close emergency contacts modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Government & Rescue Server Direct Transmission Callout Banner */}
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 border-b border-rose-900/50 p-4 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40 shrink-0">
              <Server className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  Official Government & Rescue Team Server Gateway
                </span>
                <span className="px-2 py-0.2 rounded bg-rose-900/60 text-rose-300 text-[10px] font-mono font-bold uppercase border border-rose-600/40">
                  CAP-CP v1.2 REST
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Transmit geotagged AI damage assessment & priority triage directly to NDRF, State SEOC, and ERSS 112 gateways.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEmergencyContactsOpen(false);
              openGovDispatch(selectedIncident || incidents[0]);
            }}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 border border-rose-400/40 transition-transform active:scale-95 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Forward Report to Gov Server</span>
          </button>
        </div>

        {/* Global Emergency Advice Banner */}
        <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 sm:px-6 py-2.5 text-xs text-amber-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b>Life-Threatening Emergency:</b> Dial <b>112</b> immediately. Stay on high ground and do not touch submerged cables.
            </span>
          </div>
          <button
            onClick={() => {
              setIsEmergencyContactsOpen(false);
              setIsSettingsModalOpen(true);
            }}
            className="text-[11px] text-sky-400 hover:underline font-semibold"
          >
            Configure Regional Numbers in Settings →
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="p-4 bg-[#111827] border-b border-[#1f293d] space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search emergency service, department or number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0e17] text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500 shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="text-xs text-slate-400 font-mono text-right shrink-0">
              Showing <b>{filteredContacts.length}</b> verified hotlines
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {CONTACT_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Call / Copy Toast Notification */}
        {callToast && (
          <div className="mx-4 mt-3 p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between shadow-lg animate-in fade-in">
            <span className="flex items-center gap-2 font-medium">
              <PhoneCall className="w-4 h-4 text-emerald-400 animate-bounce" />
              {callToast}
            </span>
            <span className="text-[10px] font-mono text-emerald-300">Dialer Triggered</span>
          </div>
        )}

        {/* Contacts Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 space-y-2">
              <Phone className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-300">No emergency contacts matched your search.</p>
              <p className="text-xs text-slate-500">Try clearing filters or search query.</p>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const isCopied = copiedId === contact.id;
              const isCritical = contact.priority === 'CRITICAL';

              return (
                <div
                  key={contact.id}
                  className={`relative bg-gradient-to-br from-[#111827] to-[#0a0e17] rounded-2xl p-4 sm:p-5 border transition-all hover:border-slate-600 shadow-xl flex flex-col justify-between group ${
                    isCritical ? 'border-rose-900/50 hover:border-rose-500/60 ring-1 ring-rose-500/10' : 'border-[#1f293d]'
                  }`}
                >
                  <div>
                    {/* Top Row: Icon, Name & Category */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                          contact.category === 'ALL_EMERGENCIES' || contact.category === 'FIRE_RESCUE'
                            ? 'bg-rose-950/60 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-900/30'
                            : contact.category === 'MEDICAL'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                            : contact.category === 'SECURITY'
                            ? 'bg-sky-950/60 text-sky-400 border-sky-500/40'
                            : contact.category === 'SEARCH_RESCUE'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                            : 'bg-indigo-950/60 text-indigo-400 border-indigo-500/40'
                        }`}>
                          {getEmergencyIcon(contact.iconName, "w-5 h-5")}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-sm sm:text-base leading-snug">
                            {contact.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            {contact.category.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {contact.open24x7 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-emerald-400" /> 24x7
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                      {contact.description}
                    </p>

                    {/* Phone Number Display */}
                    <div className="my-3.5 p-3 rounded-xl bg-black/40 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Emergency Number:</span>
                      <span className="font-mono text-lg font-black tracking-wider text-white">
                        {contact.number}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Call Now, Relay to Server & Copy */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
                    <a
                      href={`tel:${contact.number.replace(/\s+/g, '')}`}
                      onClick={() => handleCall(contact)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                        isCritical
                          ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-900/40 border border-rose-400/40'
                          : 'bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 shadow-sky-900/30 border border-sky-400/40'
                      }`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call {contact.number}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setIsEmergencyContactsOpen(false);
                        openGovDispatch(selectedIncident || incidents[0]);
                      }}
                      title="Forward Report to this Government/Rescue Department"
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
                    >
                      <Server className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden sm:inline">Relay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(contact.id, contact.number)}
                      title="Copy Number"
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {contact.website && (
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noreferrer"
                        title="Official Portal"
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="p-3 bg-[#0a0e17] border-t border-[#1f293d] text-center text-[11px] text-slate-500">
          <span>ResQMap Emergency Directory · Numbers can be updated for your city in <b>Settings</b>.</span>
        </div>

      </div>
    </div>
  );
}
