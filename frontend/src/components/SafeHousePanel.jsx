import React, { useState, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  X, 
  Home, 
  MapPin, 
  Navigation, 
  Phone, 
  Users, 
  Crosshair, 
  Search, 
  HeartPulse, 
  Utensils, 
  Droplets, 
  Accessibility, 
  Clock, 
  Filter, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { findNearestSafeHouses, getDirectionsUrl } from '../services/safeHouseService';

const DEMO_LOCATIONS = [
  { name: "Hyderabad (Hitec City)", lat: 17.4474, lng: 78.3745 },
  { name: "Chennai (Velachery)", lat: 12.9810, lng: 80.2180 },
  { name: "Chennai (OMR)", lat: 12.9050, lng: 80.2310 },
  { name: "Kannur (Kerala)", lat: 11.8745, lng: 75.3704 },
  { name: "Western Ghats (MH)", lat: 19.0650, lng: 73.8500 },
  { name: "Savar Commercial", lat: 23.8500, lng: 90.2650 }
];

export default function SafeHousePanel() {
  const { 
    isSafeHouseModalOpen, 
    setIsSafeHouseModalOpen, 
    safeHouses, 
    setSelectedSafeHouse,
    setActiveView,
    selectedIncident
  } = useDisaster();

  // Location state (defaults to Hyderabad / incident / browser GPS)
  const [currentLat, setCurrentLat] = useState(17.4474);
  const [currentLng, setCurrentLng] = useState(78.3745);
  const [locationLabel, setLocationLabel] = useState("Hyderabad (Hitec City)");
  const [isLocating, setIsLocating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [requireMedical, setRequireMedical] = useState(false);
  const [requireFoodWater, setRequireFoodWater] = useState(false);
  const [requireAccessibility, setRequireAccessibility] = useState(false);

  // If there's an active selected incident, offer to use its coordinates
  useEffect(() => {
    if (selectedIncident && selectedIncident.latitude && selectedIncident.longitude) {
      setCurrentLat(selectedIncident.latitude);
      setCurrentLng(selectedIncident.longitude);
      setLocationLabel(`Incident Location (${selectedIncident.id})`);
    }
  }, [selectedIncident]);

  if (!isSafeHouseModalOpen) return null;

  // Browser Geolocation
  const handleDetectLiveGps = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          setCurrentLat(lat);
          setCurrentLng(lng);
          setLocationLabel(`Live Device Location (${lat}, ${lng})`);
          setIsLocating(false);
        },
        err => {
          console.warn("Geolocation denied or error:", err);
          setIsLocating(false);
          alert("Could not obtain live GPS coordinates. Using fallback reference point.");
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Rank safehouses by distance & capacity
  const rankedShelters = findNearestSafeHouses(currentLat, currentLng, safeHouses, {
    maxDistanceKm: 1000,
    filterOpenOnly,
    requireMedical,
    requireFoodWater,
    requireAccessibility
  }).filter(sh => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return sh.name?.toLowerCase().includes(q) || 
             sh.address?.toLowerCase().includes(q) || 
             sh.city?.toLowerCase().includes(q);
    }
    return true;
  });

  const nearestShelter = rankedShelters.length > 0 ? rankedShelters[0] : null;

  const handleViewOnMap = (shelter) => {
    setSelectedSafeHouse(shelter);
    setIsSafeHouseModalOpen(false);
    setActiveView('map');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safehouse-panel-title"
    >
      <div className="relative w-full max-w-5xl bg-[#0d131f] border border-emerald-900/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1f293d] bg-gradient-to-r from-emerald-950/80 via-[#111827] to-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-md">
              <Home className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="safehouse-panel-title" className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Nearest Verified SafeHouses & Relief Shelters
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600/20 text-emerald-400 border border-emerald-500/40">
                  Live Bed Triage
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time emergency shelter occupancy, medical aid availability, and instant navigation routes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSafeHouseModalOpen(false)}
            aria-label="Close safehouse panel"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Disclaimer & Geolocation Selector Bar */}
        <div className="bg-[#111827] border-b border-[#1f293d] p-3 sm:px-5 space-y-2.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            
            {/* Current Reference Location */}
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Calculating distance from:</span>
              <span className="font-bold text-white font-mono bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                {locationLabel}
              </span>
            </div>

            {/* Location Chooser & GPS Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDetectLiveGps}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-600/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Use My Live GPS'}</span>
              </button>

              <select
                value={`${currentLat},${currentLng}`}
                onChange={e => {
                  const [lat, lng] = e.target.value.split(',').map(Number);
                  const loc = DEMO_LOCATIONS.find(l => Math.abs(l.lat - lat) < 0.01 && Math.abs(l.lng - lng) < 0.01);
                  setCurrentLat(lat);
                  setCurrentLng(lng);
                  setLocationLabel(loc ? loc.name : `Coordinates (${lat}, ${lng})`);
                }}
                className="bg-[#0a0e17] text-xs text-white p-1.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-emerald-500 font-medium"
              >
                {DEMO_LOCATIONS.map((loc, i) => (
                  <option key={i} value={`${loc.lat},${loc.lng}`}>
                    📍 {loc.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Search & Filter Toggles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search shelters by name, area or city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0e17] text-xs text-white pl-9 pr-3 py-2 rounded-xl border border-[#1f293d] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Filter Checkboxes */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => setFilterOpenOnly(!filterOpenOnly)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                  filterOpenOnly ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Open Only</span>
              </button>

              <button
                onClick={() => setRequireMedical(!requireMedical)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                  requireMedical ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <HeartPulse className="w-3 h-3" />
                <span>Medical Bay</span>
              </button>

              <button
                onClick={() => setRequireFoodWater(!requireFoodWater)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                  requireFoodWater ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Utensils className="w-3 h-3" />
                <span>Food & Water</span>
              </button>

              <button
                onClick={() => setRequireAccessibility(!requireAccessibility)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                  requireAccessibility ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Accessibility className="w-3 h-3" />
                <span>Wheelchair Access</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* TOP HERO: Nearest Shelter Callout */}
          {nearestShelter && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/80 via-[#111e2e] to-[#0d1624] border border-emerald-500/40 p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    RECOMMENDED NEAREST SAFEHOUSE
                  </div>
                  <h4 className="text-lg font-black text-white">{nearestShelter.name}</h4>
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {nearestShelter.address}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {nearestShelter.distanceKm} km
                  </span>
                  <span className="text-[11px] text-slate-300 block font-semibold">
                    ETA ~{nearestShelter.driveEta} (Drive) · ~{nearestShelter.walkEta} (Walk)
                  </span>
                </div>
              </div>

              {/* Occupancy and Key Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Available Beds</span>
                  <span className="font-bold text-white text-sm font-mono text-emerald-400">
                    {nearestShelter.availableBeds} beds free
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Medical Support</span>
                  <span className="font-bold text-emerald-300">
                    {nearestShelter.medicalSupport ? '✓ Doctor on Duty' : 'First Aid Only'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Food & Clean Water</span>
                  <span className="font-bold text-amber-300">
                    {nearestShelter.foodAvailable && nearestShelter.waterAvailable ? '✓ Ready / 24x7' : 'Limited'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-400 uppercase">
                    ● {nearestShelter.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-900/40">
                <a
                  href={getDirectionsUrl(nearestShelter.latitude, nearestShelter.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate in Google Maps</span>
                </a>

                {nearestShelter.contactPhone && (
                  <a
                    href={`tel:${nearestShelter.contactPhone.replace(/\s+/g, '')}`}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Call Shelter</span>
                  </a>
                )}

                <button
                  onClick={() => handleViewOnMap(nearestShelter)}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>View on Live Map</span>
                </button>

                <button
                  onClick={() => setSelectedSafeHouse(nearestShelter)}
                  className="py-2 px-3 text-slate-400 hover:text-white text-xs underline font-semibold ml-auto"
                >
                  More Details →
                </button>
              </div>
            </div>
          )}

          {/* All Safehouses Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Home className="w-4 h-4 text-emerald-400" />
                All Regional Safehouses ({rankedShelters.length})
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">Sorted by Distance & Bed Availability</span>
            </div>

            {rankedShelters.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No operational safehouse found within the current filters.</p>
                <p className="text-xs text-slate-400">Please adjust filter options or contact emergency hotlines.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rankedShelters.map(sh => {
                  const isFull = sh.status === 'FULL';
                  const isLimited = sh.status === 'LIMITED';

                  return (
                    <div
                      key={sh.id}
                      className={`bg-[#111827] rounded-2xl p-4 border transition-all hover:border-slate-600 shadow-md flex flex-col justify-between ${
                        isFull ? 'border-rose-900/30 opacity-75' : isLimited ? 'border-amber-900/40' : 'border-[#1f293d]'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-slate-400">{sh.id}</span>
                              <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                                sh.status === 'OPEN' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' :
                                sh.status === 'LIMITED' ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                                'bg-rose-950 text-rose-300 border border-rose-500/40'
                              }`}>
                                {sh.status}
                              </span>
                            </div>
                            <h5 className="font-bold text-white text-sm mt-0.5 line-clamp-1">{sh.name}</h5>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-sm font-black text-emerald-400">
                              {sh.distanceKm} km
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ~{sh.driveEta} drive
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">
                          {sh.address}
                        </p>

                        {/* Occupancy Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Occupancy:</span>
                            <span className="font-mono font-bold text-slate-200">
                              {sh.availableBeds} beds available ({sh.currentOccupancy}/{sh.capacity})
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                sh.occupancyRate > 90 ? 'bg-rose-500' : sh.occupancyRate > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${sh.occupancyRate}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                          {sh.medicalSupport && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <HeartPulse className="w-3 h-3" /> Medical Bay
                            </span>
                          )}
                          {sh.foodAvailable && (
                            <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Utensils className="w-3 h-3" /> Meals
                            </span>
                          )}
                          {sh.accessibility && (
                            <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <Accessibility className="w-3 h-3" /> Accessible
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800">
                        <a
                          href={getDirectionsUrl(sh.latitude, sh.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm transition-colors"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Navigate</span>
                        </a>

                        <button
                          onClick={() => handleViewOnMap(sh)}
                          className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
                        >
                          Map
                        </button>

                        <button
                          onClick={() => setSelectedSafeHouse(sh)}
                          className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
                        >
                          Details
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0e17] border-t border-[#1f293d] text-center text-[11px] text-slate-500">
          <span>ResQMap SafeHouse Network · In high-risk flood/collapse zones, prioritize official government evacuation routes.</span>
        </div>

      </div>
    </div>
  );
}
