import React, { useState } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { 
  X, 
  Settings, 
  Key, 
  Server, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Wifi,
  WifiOff,
  Info,
} from 'lucide-react';

export default function SettingsModal() {
  const { 
    isSettingsModalOpen, 
    setIsSettingsModalOpen, 
    geminiApiKey, 
    updateApiKey,
    physicalNodes,
    activeNodeUrl,
    isOnline,
    updateNodes,
    resetDemoData,
  } = useDisaster();

  const [inputKey, setInputKey] = useState(geminiApiKey);
  // Join configured nodes with newlines for editing
  const [inputNodes, setInputNodes] = useState(
    physicalNodes.length > 0 ? physicalNodes.join('\n') : ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    updateApiKey(inputKey.trim());

    // Parse and apply node URLs
    const parsed = inputNodes
      .split(/[,\n]/)
      .map(u => u.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      updateNodes(parsed);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsSettingsModalOpen(false);
    }, 800);
  };

  const formatActiveUrl = (url) => {
    try { return new URL(url).host; } catch { return url; }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d131f] border border-[#1f293d] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#1f293d] bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/40">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">System & API Configuration</h3>
              <p className="text-xs text-slate-400">
                Gemini Vision AI integration & physical teammate machine endpoints
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-300">
          
          {/* Gemini API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                className="w-full bg-[#111827] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If no API key is provided, ResQMap utilizes its built-in <b>Smart Hybrid Computer Vision Analyzer</b> to classify damage offline.
              </p>
            </div>
          </div>

          {/* Physical Machine Backend URLs */}
          <div className="space-y-2 pt-2 border-t border-[#1f293d]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-rose-400" />
                Physical Machine Backend URLs
              </label>
              {/* Current status pill */}
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                isOnline
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                  : 'bg-rose-950 text-rose-300 border-rose-600/40'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? formatActiveUrl(activeNodeUrl) : 'Offline'}
              </span>
            </div>

            <textarea
              rows={3}
              placeholder={
                'http://192.168.1.X:8000\nhttp://192.168.1.Y:8000\nhttp://192.168.1.Z:8000'
              }
              value={inputNodes}
              onChange={e => setInputNodes(e.target.value)}
              className="w-full bg-[#111827] text-xs text-white px-3 py-2.5 rounded-xl border border-[#1f293d] focus:outline-none focus:border-sky-500 font-mono resize-none leading-relaxed"
              spellCheck={false}
            />

            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
                <p>
                  Enter one URL per line (or comma-separated). The frontend health-checks each machine in order and uses the first reachable one. If it goes offline, it automatically tries the next.
                </p>
                <p>
                  <b className="text-slate-300">Find your LAN IP:</b>{' '}
                  Windows: <code className="bg-black/30 px-1 rounded">ipconfig</code> → IPv4 Address |{' '}
                  macOS/Linux: <code className="bg-black/30 px-1 rounded">ifconfig</code>
                </p>
                <p className="text-amber-400/80">
                  ⚠ All machines must also have <code className="bg-black/30 px-1 rounded">DATABASE_URL</code> set to the same Supabase connection string in <code className="bg-black/30 px-1 rounded">.env</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-200 block">Reset Demo State</span>
              <span className="text-[11px] text-slate-400">Restore 8 initial seed disaster incidents around Chennai.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                alert("Demo data reset to default seed state.");
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Data</span>
            </button>
          </div>

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-[#1f293d] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md shadow-sky-900/30 flex items-center gap-1.5"
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-white" /> : null}
              <span>{savedSuccess ? "Saved!" : "Save Settings"}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
