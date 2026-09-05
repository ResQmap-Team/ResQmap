import React from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  X, 
  Home, 
  MapPin, 
  Phone, 
  Navigation, 
  Users, 
  ShieldCheck, 
  HeartPulse, 
  Utensils, 
  Droplets, 
  Accessibility, 
  Clock, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getDirectionsUrl } from '../services/safeHouseService';

export default function SafeHouseDetailsModal() {
  const { 
    selectedSafeHouse, 
    setSelectedSafeHouse, 
    setActiveView 
  } = useDisaster();

  if (!selectedSafeHouse) return null;

  const sh = selectedSafeHouse;
  const directionsUrl = getDirectionsUrl(sh.latitude, sh.longitude);
  const occupancyPercent = sh.capacity > 0 ? Math.round((sh.currentOccupancy / sh.capacity) * 100) : 100;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'LIMITED':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'FULL':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0d131f] border border-emerald-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f293d] bg-gradient-to-r from-emerald-950/60 via-[#111827] to-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">{sh.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(sh.status)}`}>
                  {sh.status}
                </span>
                {sh.isDemoData && (
                  <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-black/40 border border-slate-800">
                    Demo Shelter
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-white text-base mt-0.5 line-clamp-1">
                {sh.name}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setSelectedSafeHouse(null)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] text-xs text-slate-300">
          
          {/* Location & GPS */}
          <div className="p-3.5 rounded-xl bg-[#111827] border border-[#1f293d] space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sh.address}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Coordinates: {sh.latitude.toFixed(4)}, {sh.longitude.toFixed(4)}</span>
              {sh.distanceKm !== undefined && (
                <span className="text-emerald-400 font-bold">{sh.distanceKm} km away ({sh.driveEta || 'N/A'})</span>
              )}
            </div>
          </div>

          {/* Capacity & Occupancy Bar */}
          <div className="p-4 rounded-xl bg-[#111827] border border-[#1f293d] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Shelter Bed Capacity & Occupancy
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {sh.currentOccupancy} / {sh.capacity} ({occupancyPercent}%)
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPercent > 90 ? 'bg-rose-500' : occupancyPercent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, occupancyPercent)}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Available Beds</span>
                <span className="text-sm font-black font-mono text-emerald-400">{sh.availableBeds} beds</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Operating Hours</span>
                <span className="text-sm font-bold text-white flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> 24x7 Open
                </span>
              </div>
            </div>
          </div>

          {/* Essential Relief Provisions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 ${
              sh.medicalSupport ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <HeartPulse className="w-4 h-4" />
              <span className="text-[11px] font-bold">Medical Support</span>
              <span className="text-[10px]">{sh.medicalSupport ? 'Doctor on Duty' : 'Not Available'}</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 ${
              sh.foodAvailable ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Utensils className="w-4 h-4" />
              <span className="text-[11px] font-bold">Food & Meals</span>
              <span className="text-[10px]">{sh.foodAvailable ? 'Hot Meals Ready' : 'Dry Rations'}</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 ${
              sh.waterAvailable ? 'bg-sky-950/40 border-sky-500/30 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Droplets className="w-4 h-4" />
              <span className="text-[11px] font-bold">Clean Water</span>
              <span className="text-[10px]">{sh.waterAvailable ? 'Tankers Synced' : 'Limited'}</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 ${
              sh.accessibility ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <Accessibility className="w-4 h-4" />
              <span className="text-[11px] font-bold">Accessibility</span>
              <span className="text-[10px]">{sh.accessibility ? 'Wheelchair Ramp' : 'Stairs Only'}</span>
            </div>
          </div>

          {/* On-Site Amenities List */}
          {sh.amenities?.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                Shelter Facilities & Staging Capabilities:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sh.amenities.map((amenity, idx) => (
                  <span 
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{amenity}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Operational Notes */}
          {sh.notes && (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-300 text-xs">
              <span className="font-bold text-slate-200 block mb-0.5">Disaster Coordination Note:</span>
              <p>{sh.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-[#1f293d] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            {sh.contactPhone && (
              <a
                href={`tel:${sh.contactPhone.replace(/\s+/g, '')}`}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call Shelter: {sh.contactPhone}</span>
              </a>
            )}

            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 border border-emerald-400/40 transition-transform active:scale-95"
            >
              <Navigation className="w-4 h-4" />
              <span>Navigate in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
