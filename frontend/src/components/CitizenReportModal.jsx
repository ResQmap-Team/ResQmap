import React, { useState, useRef } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { extractPhotoMetadata, fileToBase64 } from '../services/exifService';
import { classifyDisasterImage } from '../services/geminiClassifier';
import { 
  X, 
  Upload, 
  Camera, 
  MapPin, 
  Crosshair, 
  ShieldAlert, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Send,
  HelpCircle,
  LifeBuoy,
  User,
  Phone,
  Ban,
  Home,
  Navigation,
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SEVERITY_CONFIG } from '../data/seedIncidents';
import { findNearestSafeHouses, getDirectionsUrl } from '../services/safeHouseService';

export default function CitizenReportModal() {
  const { 
    isReportModalOpen, 
    setIsReportModalOpen, 
    addIncident,
    geminiApiKey,
    setActiveView,
    safeHouses,
    setIsEmergencyContactsOpen
  } = useDisaster();


  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [latitude, setLatitude] = useState(12.9785);
  const [longitude, setLongitude] = useState(80.2206);
  const [address, setAddress] = useState('Velachery Main Road, Chennai');
  const [exifFound, setExifFound] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');
  
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [trappedCount, setTrappedCount] = useState(0);
  const [needsMedical, setNeedsMedical] = useState(false);
  const [needsBoat, setNeedsBoat] = useState(false);
  const [hasElderlyOrInfants, setHasElderlyOrInfants] = useState(false);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Find nearest safehouse dynamically as coordinates change
  const nearbySafeHouses = findNearestSafeHouses(latitude, longitude, safeHouses || [], { maxDistanceKm: 150 });
  const nearestSafeHouse = nearbySafeHouses.length > 0 ? nearbySafeHouses[0] : null;

  if (!isReportModalOpen) return null;


  // Handle Photo Upload & Automatic EXIF extraction + Real-time AI pre-triage
  const handlePhotoSelect = async (file) => {
    if (!file) return;
    setImageFile(file);

    try {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);

      // 1. Extract EXIF GPS Metadata
      const metadata = await extractPhotoMetadata(file);
      if (metadata && metadata.hasGps) {
        setLatitude(metadata.latitude);
        setLongitude(metadata.longitude);
        setExifFound(true);
        setDeviceInfo(metadata.device || 'Mobile Phone');
        setAddress(`GPS Geotag: ${metadata.latitude}, ${metadata.longitude}`);
      } else {
        setExifFound(false);
      }

      // 2. Real-time AI Damage Classification & Verification
      setIsAnalyzing(true);
      const result = await classifyDisasterImage(base64, geminiApiKey);
      setAnalysisResult(result);
      if (result && result.hazardCategory) {
        setTitle(`Citizen SOS: ${result.hazardCategory}`);
      }
    } catch (err) {
      console.warn("Processing image error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Browser Geolocation
  const handleGetLiveGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setAddress(`Live Device Coordinates: ${lat}, ${lng}`);
        },
        err => console.warn("Geolocation error:", err)
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imagePreview) {
      alert("Please upload or capture a disaster photograph.");
      return;
    }

    setIsSubmitting(true);

    const newIncident = {
      title: title || (analysisResult ? `Citizen SOS: ${analysisResult.hazardCategory}` : "Citizen Disaster Report"),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || "Geotagged Citizen Location",
      imageUrl: imagePreview,
      hazardCategory: analysisResult ? analysisResult.hazardCategory : "Other Hazard",
      severity: analysisResult ? analysisResult.severity : "MEDIUM",
      isRealDisaster: analysisResult ? analysisResult.isRealDisaster : true,
      authenticityScore: analysisResult ? analysisResult.authenticityScore : 90.0,
      confidence: analysisResult ? analysisResult.confidence : 0.9,
      falseAlarmReason: analysisResult?.falseAlarmReason || null,
      visualFeatures: analysisResult?.visualFeatures || ["Visual anomaly submitted by citizen"],
      recommendedUnits: analysisResult?.recommendedUnits || ["General Disaster Response Team"],
      damageAssessment: analysisResult?.damageAssessment || "Citizen emergency report logged.",
      safetyInstructions: analysisResult?.safetyInstructions || ["Stay clear of hazard area."],
      reporterName: reporterName || "Anonymous Citizen",
      reporterPhone: reporterPhone || null,
      trappedCount: parseInt(trappedCount) || 0,
      needsMedical,
      needsBoat,
      hasElderlyOrInfants,
      notes: notes || null,
      status: analysisResult?.isRealDisaster ? "VERIFIED" : "FLAGGED_FALSE_ALARM"
    };

    addIncident(newIncident);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setIsReportModalOpen(false);
      setActiveView('map');
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d131f] border border-[#1f293d] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#1f293d] bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Submit Citizen Disaster SOS</h3>
              <p className="text-xs text-slate-400">
                Ground-level photo submission with AI damage verification & GPS geotagging
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEmergencyContactsOpen(true)}
              className="px-2.5 py-1 bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-600/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              title="Call Emergency Helplines"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Helplines</span>
            </button>
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Photo Dropzone / Camera Capture */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              1. Ground-Level Disaster Photograph *
            </label>

            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-[#1f293d] hover:border-rose-500/60 rounded-2xl p-8 bg-[#111827]/60 hover:bg-[#111827] flex flex-col items-center justify-center text-center transition-all group"
              >
                <div className="p-4 rounded-full bg-slate-800/80 group-hover:bg-rose-600/20 text-slate-300 group-hover:text-rose-400 mb-3 transition-colors">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Drag & Drop or Click to Upload Disaster Photo
                </h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Accepts ground-level photos shot in poor light, tilted angles, or storm conditions (JPEG, PNG, HEIC).
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600/20 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30">
                  <Camera className="w-3.5 h-3.5" /> Auto-Extracts EXIF GPS Geotag
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={e => handlePhotoSelect(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#1f293d] bg-black">
                <img
                  src={imagePreview}
                  alt="Disaster Preview"
                  className="w-full h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setAnalysisResult(null);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 text-white hover:bg-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* EXIF Badge */}
                {exifFound && (
                  <div className="absolute top-3 left-3 bg-emerald-950/90 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/40 backdrop-blur-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    EXIF Geotag Extracted ({deviceInfo})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Pre-Triage Real-time Card */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-900/60 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              <div>
                <span className="text-xs font-bold text-sky-300">AI Vision Analyzing Damage Telemetry...</span>
                <p className="text-[11px] text-slate-400">Classifying hazard type, severity level & verifying authenticity.</p>
              </div>

            </div>
          )}

          {analysisResult && !isAnalyzing && (
            <div className={`p-4 rounded-xl border ${
              analysisResult.isRealDisaster
                ? 'bg-gradient-to-br from-[#111827] to-[#162238] border-sky-600/40'
                : 'bg-gradient-to-br from-[#1c1218] to-[#26151c] border-rose-600/40'
            } shadow-lg space-y-3`}>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Instant AI Pre-Triage Assessment
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  SEVERITY_CONFIG[analysisResult.severity]?.badge || 'bg-slate-700 text-white'
                }`}>
                  {analysisResult.severity}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Classified Hazard</span>
                  <span className="font-bold text-white">{analysisResult.hazardCategory}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Authenticity Verification</span>
                  <span className={`font-bold ${analysisResult.isRealDisaster ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {analysisResult.isRealDisaster ? `✓ ${analysisResult.authenticityScore.toFixed(1)}% Real Emergency` : '✗ Flagged False Alarm'}
                  </span>
                </div>
              </div>

              {/* Visual Driving Factors */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Identified Visual Evidence:
                </span>
                <ul className="text-xs text-slate-300 space-y-1">
                  {analysisResult.visualFeatures?.slice(0, 3).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety Guidance */}
              {analysisResult.safetyInstructions?.length > 0 && (
                <div className="p-2.5 bg-sky-950/40 rounded-lg border border-sky-700/30 text-xs text-sky-200 flex items-start gap-2">
                  <LifeBuoy className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <b>Immediate Safety Advice:</b> {analysisResult.safetyInstructions[0]}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location & GPS Coordinates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                2. Geolocation & Incident Location *
              </label>
              <button
                type="button"
                onClick={handleGetLiveGps}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
              >
                <Crosshair className="w-3.5 h-3.5" /> Get My Live GPS
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={e => setLatitude(parseFloat(e.target.value))}
                  required
                  className="w-full bg-[#111827] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={e => setLongitude(parseFloat(e.target.value))}
                  required
                  className="w-full bg-[#111827] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Address / Landmark</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g., Near Velachery Main Bridge, South Gate"
                required
                className="w-full bg-[#111827] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* SAFEHOUSE INTEGRATION: Real-time Nearest SafeHouse Recommendation */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/70 to-[#111827] border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Home className="w-4 h-4 text-emerald-400" />
                Nearest Operational SafeHouse for Immediate Evacuation
              </span>
              {nearestSafeHouse && (
                <span className="font-mono text-[10px] font-bold text-emerald-400 bg-black/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  {nearestSafeHouse.distanceKm} km · ~{nearestSafeHouse.driveEta}
                </span>
              )}
            </div>

            {nearestSafeHouse ? (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-white text-xs sm:text-sm">{nearestSafeHouse.name}</h4>
                    <p className="text-[11px] text-slate-300">{nearestSafeHouse.address}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40 shrink-0">
                    {nearestSafeHouse.status} ({nearestSafeHouse.availableBeds || nearestSafeHouse.available_beds} beds available)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-400">
                    {nearestSafeHouse.medicalSupport || nearestSafeHouse.medical_support ? '✓ Doctor on Duty' : 'First Aid Kit'} · {nearestSafeHouse.foodAvailable || nearestSafeHouse.food_available ? '✓ Meals & Clean Water' : 'Dry Rations'}
                  </span>
                  <a
                    href={getDirectionsUrl(nearestSafeHouse.latitude, nearestSafeHouse.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1 text-xs shadow-md transition-transform active:scale-95"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>View Route</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>No operational safehouse found within current radius.</span>
                <button
                  type="button"
                  onClick={() => setIsEmergencyContactsOpen(true)}
                  className="text-rose-400 hover:underline font-bold"
                >
                  Call Emergency Lines →
                </button>
              </div>
            )}
          </div>

          {/* Citizen Urgency Questionnaire */}
          <div className="space-y-3 pt-2 border-t border-[#1f293d]">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
              3. Emergency Triage & Urgency Indicators
            </label>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Number of People Trapped</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={trappedCount}
                  onChange={e => setTrappedCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#111827] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Your Phone / Contact (Optional)</label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={e => setReporterPhone(e.target.value)}
                  placeholder="+91 98400 00000"
                  className="w-full bg-[#111827] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* Checkbox Urgency Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111827] border border-[#1f293d] hover:border-slate-700 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={needsMedical}
                  onChange={e => setNeedsMedical(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-200">🏥 Medical Urgency</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111827] border border-[#1f293d] hover:border-slate-700 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={needsBoat}
                  onChange={e => setNeedsBoat(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-200">🚤 Rescue Boat Needed</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111827] border border-[#1f293d] hover:border-slate-700 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={hasElderlyOrInfants}
                  onChange={e => setHasElderlyOrInfants(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-200">👶 Elderly / Infants</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Additional Observations / Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Water rising 1 inch every 10 minutes, power lines sparking near corner shop..."
                className="w-full bg-[#111827] text-xs text-white p-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-rose-500"
              ></textarea>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-[#1f293d] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !imagePreview}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center gap-2 border border-rose-400/40 transition-transform active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting SOS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmit Disaster SOS to Live Map</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
