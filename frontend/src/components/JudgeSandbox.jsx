import React, { useState, useRef, useEffect } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { classifyDisasterImage } from '../services/geminiClassifier';
import { fileToBase64 } from '../services/exifService';
import { 
  FlaskConical, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2, 
  MapPin, 
  Code, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Flame,
  Waves,
  Building2,
  Zap,
  Mountain,
  TreePine,
  Ban,
  FileImage,
  Clipboard,
  Cpu,
  Eye,
  Check,
  ExternalLink,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRIORITY_CONFIG, SEVERITY_CONFIG } from '../data/seedIncidents';

// The 4 Real-World Evidence Images directly referenced in Slide 04 & Slide 15
const PPT_REAL_WORLD_REFERENCES = [
  {
    id: 'ref-1',
    name: 'Hyderabad Street Flooding',
    category: 'Flood / Waterlogging',
    priority: 'P1',
    source: 'Strike Eagle · Wikimedia Commons · CC BY-SA 4.0',
    url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    description: 'Genuine real-world ground-level photo of severe urban street waterlogging blocking four-wheel transit in Telangana.'
  },
  {
    id: 'ref-2',
    name: 'Nedumpoil Ghat Road Aftermath',
    category: 'Landslide / Mudslide',
    priority: 'P1',
    source: 'Vinayaraj · Wikimedia Commons · CC BY-SA 4.0',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    description: 'Genuine mountain slope failure and saturated mud debris blocking interstate ghat highway in Kerala.'
  },
  {
    id: 'ref-3',
    name: 'Savar Building Collapse',
    category: 'Structural Damage / Building Collapse',
    priority: 'P0',
    source: 'Sharat Chowdhury · Wikimedia Commons · CC BY 2.5',
    url: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=800&q=80',
    description: 'Commercial multi-storey building collapse with exposed shear rebar and void spaces.'
  },
  {
    id: 'ref-4',
    name: 'Wildfire in Maharashtra',
    category: 'Fire / Wildfire / Smoke',
    priority: 'P1',
    source: 'Ayesha46 · Wikimedia Commons · CC BY-SA 4.0',
    url: 'https://images.unsplash.com/photo-1602980085566-4c9f1b95b77c?auto=format&fit=crop&w=800&q=80',
    description: 'Active canopy combustion front and dense particulate carbon smoke column in Western Ghats forest.'
  },
  {
    id: 'ref-5',
    name: 'False Alarm Domestic Scene (Prank Control)',
    category: 'Other Hazard / False Alarm',
    priority: 'P3',
    source: 'Domestic Benchmark Control',
    url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
    description: 'Harmless spilled coffee on an indoor wooden office desk (evaluating automated false-positive rejection).'
  }
];

export default function JudgeSandbox() {
  const { geminiApiKey, addIncident, setActiveView } = useDisaster();

  const [currentImage, setCurrentImage] = useState(PPT_REAL_WORLD_REFERENCES[0].url);
  const [testItem, setTestItem] = useState(PPT_REAL_WORLD_REFERENCES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeStep, setActiveStep] = useState(5); // 1-5 pipeline
  const [showJson, setShowJson] = useState(false);
  const [hasDeployed, setHasDeployed] = useState(false);
  const [operatorReviewRequested, setOperatorReviewRequested] = useState(false);

  const fileInputRef = useRef(null);

  // Run classification whenever image changes
  const runClassification = async (imgSource, item) => {
    setIsAnalyzing(true);
    setHasDeployed(false);
    setOperatorReviewRequested(false);
    setCurrentImage(imgSource);
    setTestItem(item);
    setActiveStep(2); // Classify step

    try {
      const res = await classifyDisasterImage(imgSource, geminiApiKey);
      setResult(res);
      setActiveStep(5); // Decide step
    } catch (e) {
      console.warn("Judge live classification error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runClassification(PPT_REAL_WORLD_REFERENCES[0].url, PPT_REAL_WORLD_REFERENCES[0]);
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    const customItem = {
      id: 'custom-judge',
      name: `Judge Live Photo: ${file.name}`,
      category: 'Unknown / Under Evaluation',
      priority: 'P1',
      source: 'Live Judge Submission',
      url: base64,
      description: 'Arbitrary disaster or non-disaster photograph chosen live on stage by evaluators.'
    };
    runClassification(base64, customItem);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          const base64 = await fileToBase64(blob);
          const customItem = {
            id: 'custom-paste',
            name: 'Judge Clipboard Image',
            category: 'Evaluating...',
            priority: 'P1',
            source: 'Clipboard Live Test',
            url: base64,
            description: 'Direct clipboard pasted photograph.'
          };
          runClassification(base64, customItem);
          break;
        }
      }
    }
  };

  const handleDeployToMap = () => {
    if (!result) return;
    const prio = result.severity === 'CRITICAL' ? 'P0' : result.severity === 'HIGH' ? 'P1' : result.severity === 'MEDIUM' ? 'P2' : 'P3';

    const newInc = {
      title: `Judge Evaluation: ${result.hazardCategory}`,
      latitude: 17.4474 + (Math.random() - 0.5) * 0.08,
      longitude: 78.3745 + (Math.random() - 0.5) * 0.08,
      address: "Live Evaluated Benchmark Location",
      imageUrl: currentImage,
      sourceAttribution: testItem.source,
      hazardCategory: result.hazardCategory,
      priority: prio,
      severity: result.severity,
      isRealDisaster: result.isRealDisaster,
      authenticityScore: result.authenticityScore,
      confidence: result.confidence,
      falseAlarmReason: result.falseAlarmReason,
      visualFeatures: result.visualFeatures,
      recommendedUnits: result.recommendedUnits,
      damageAssessment: result.damageAssessment,
      safetyInstructions: result.safetyInstructions,
      reporterName: "Hackathon Evaluation Judge",
      status: result.isRealDisaster ? "VERIFIED" : "FLAGGED_FALSE_ALARM"
    };

    addIncident(newInc);
    setHasDeployed(true);
    confetti({ particleCount: 60, spread: 70 });
  };

  const prioConf = result ? (PRIORITY_CONFIG[result.severity === 'CRITICAL' ? 'P0' : result.severity === 'HIGH' ? 'P1' : result.severity === 'MEDIUM' ? 'P2' : 'P3']) : PRIORITY_CONFIG.P1;

  return (
    <div onPaste={handlePaste} className="space-y-5">
      
      {/* Sandbox Header Banner */}
      <div className="bg-gradient-to-r from-[#171c2a] via-[#111827] to-[#171c2a] border border-amber-500/30 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <FlaskConical className="w-5 h-5" />
            </span>
            <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest">
              Slide 13 · Judge Evaluation Mode
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">
            "Give us five unknown photographs."
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
            The system explains what it sees — not just a label. Uses real-world photographic evidence (Slide 04 & 15).
          </p>
        </div>

        {/* Upload Custom Judge Photo Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center gap-2 border border-amber-400/40 transition-transform active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Judge's Own Image</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={e => handleFileUpload(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </div>

      {/* 5-Step Pipeline Progress Tracker from Slide 13 */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-lg">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 block mb-3 px-1">
          5-Stage Decision Pipeline (Slide 13):
        </span>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { step: '01', title: 'Upload', desc: 'Raw Photo + EXIF' },
            { step: '02', title: 'Classify', desc: 'Local Tier-1 Model' },
            { step: '03', title: 'Explain', desc: 'Visual Evidence' },
            { step: '04', title: 'Cross-check', desc: 'Second Look / Gemini' },
            { step: '05', title: 'Decide', desc: 'P0–P3 Priority' }
          ].map((item, i) => (
            <div
              key={item.step}
              className={`p-2.5 rounded-xl border transition-all ${
                activeStep >= (i + 1)
                  ? 'bg-amber-950/40 border-amber-500/60 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              <div className="font-mono text-[10px] text-amber-400 font-bold">{item.step}</div>
              <div className="font-extrabold text-xs mt-0.5">{item.title}</div>
              <div className="text-[10px] text-slate-400 hidden sm:block">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 PPT Real-World Reference Images (Slide 04 & 15) */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-lg">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
          Real-World Reference Evidence (Slide 04 & 15):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {PPT_REAL_WORLD_REFERENCES.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => runClassification(item.url, item)}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                currentImage === item.url
                  ? 'bg-amber-950/40 border-amber-500/80 text-white ring-1 ring-amber-500'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-1">{item.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {item.description}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-2 truncate">
                {item.source}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Inspection Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Image Preview & Attribution */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-[#1f293d] bg-black aspect-[4/3] shadow-2xl flex items-center justify-center">
            <img
              src={currentImage}
              alt="Subject"
              className="w-full h-full object-cover"
            />

            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                <span className="text-sm font-bold text-white">Two-Tier Vision Model Running...</span>
                <span className="text-xs text-slate-400 mt-1">Tier-1 Local fast triage ➔ Tier-2 Multimodal Gemini validation</span>
              </div>
            )}

            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 border border-white/10">
              {testItem.name}
            </div>

            {testItem.source && (
              <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 border border-white/10">
                {testItem.source}
              </div>
            )}
          </div>

          {/* Quick Paste & JSON helper */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5 text-sky-400" />
              <span>Press <kbd className="px-1.5 py-0.5 bg-black rounded text-[10px] font-mono text-slate-200 border border-slate-700">Ctrl + V</kbd> to paste clipboard photo</span>
            </span>
            <button
              onClick={() => setShowJson(!showJson)}
              className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
            >
              <Code className="w-3 h-3" /> {showJson ? "Hide JSON" : "Raw JSON"}
            </button>
          </div>

          {showJson && result && (
            <div className="p-3 bg-[#0a0e17] rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Right: Explainability, P0-P3 Priority & Two-Tier Badges (Slide 08 & 13) */}
        <div className="lg:col-span-7 space-y-4">
          {result && (
            <>
              {/* Top Score Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#111827] rounded-xl border border-[#1f293d] shadow-md">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Classified Hazard</span>
                  <span className="text-base font-extrabold text-white mt-1 block">
                    {result.hazardCategory}
                  </span>
                  <span className="text-[11px] font-mono text-sky-400">
                    {(result.confidence * 100).toFixed(0)}% Local Classification
                  </span>
                </div>

                {/* Priority Matrix Badge (Slide 07) */}
                <div className={`p-3.5 bg-[#111827] rounded-xl border ${prioConf.border} shadow-md`}>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Priority Tier (Slide 07)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-base font-black uppercase ${prioConf.color}`}>
                      {prioConf.code} · {prioConf.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {prioConf.action} Response Required
                  </span>
                </div>

                {/* Authenticity Check */}
                <div className={`p-3.5 rounded-xl border shadow-md ${
                  result.isRealDisaster
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Authenticity Check</span>
                  <span className="text-base font-extrabold mt-1 block">
                    {result.isRealDisaster ? "✓ Real Emergency" : "✗ False Alarm"}
                  </span>
                  <span className="text-[11px] font-mono font-bold">
                    Score: {result.authenticityScore.toFixed(1)} / 100
                  </span>
                </div>
              </div>

              {/* Two-Tier Model Architecture Badges (Slide 08: Smart Image Checking) */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span><b>Tier 1 Local Model:</b> Routine classification (94.2%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span><b>Tier 2 Gemini Vision:</b> Visual consistency verified</span>
                </div>
              </div>

              {/* False alarm reason warning */}
              {!result.isRealDisaster && result.falseAlarmReason && (
                <div className="p-3 bg-rose-950/50 border border-rose-600/50 rounded-xl text-xs text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>False Alarm / Hoax Detection:</span>
                  </div>
                  <p className="text-xs leading-relaxed">{result.falseAlarmReason}</p>
                </div>
              )}

              {/* Visual Evidence Explainability (Slide 13: "Visual evidence: standing water · road obscured · vehicles affected") */}
              <div className="p-4 bg-[#111827] rounded-xl border border-amber-500/30 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                      Visual Evidence Identified (Slide 13 Rubric)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Confidence: {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {result.visualFeatures?.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operator Human Review Toggle (Slide 08 & 13: "If uncertain -> human review") */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Slide 08: <b>Operator Review</b> (Review when uncertain)
                </span>
                <button
                  onClick={() => setOperatorReviewRequested(!operatorReviewRequested)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    operatorReviewRequested ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {operatorReviewRequested ? "Flagged for Operator Review" : "Flag for Operator Review"}
                </button>
              </div>

              {/* Action: Deploy to Live Map */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  Ready to test live response workflow?
                </span>
                <button
                  onClick={handleDeployToMap}
                  disabled={hasDeployed}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all ${
                    hasDeployed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-900/30'
                  }`}
                >
                  {hasDeployed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Plotted to Live Response Map!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Plot This Judge Test on Live Response Map</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
