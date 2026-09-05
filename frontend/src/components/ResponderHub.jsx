import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDisaster } from '../context/DisasterContext';
import { liveStreamService } from '../services/liveStreamService';
import { gpsTracker } from '../services/gpsTracker';
import { 
  Video, 
  VideoOff, 
  Compass, 
  Navigation, 
  Radio, 
  Volume2, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  Flame, 
  Waves, 
  Building2, 
  Zap, 
  Camera, 
  Maximize2,
  Crosshair,
  Wifi,
  Sparkles,
  Users,
  Cast,
  Tv,
  Share2,
  Copy,
  Check,
  AlertCircle,
  LocateFixed,
  LocateOff,
  Satellite,
  Signal,
  SignalLow,
  SignalZero,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PRIORITY_CONFIG, SEVERITY_CONFIG } from '../data/seedIncidents';




export default function ResponderHub() {
  const { 
    incidents, 
    activeResponderIncident, 
    setActiveResponderIncident, 
    updateIncidentStatus,
    setSelectedIncident,
    activeFeeds,            // ← real feed list from backend via DisasterContext
  } = useDisaster();

  // Mode: 'broadcast' (sending my camera) | 'watch' (watching colleague stream via peer_room_id) | 'idle'
  const [streamMode, setStreamMode] = useState('idle'); // 'broadcast' | 'watch' | 'idle'
  const [selectedFeed, setSelectedFeed] = useState(null);  // a real DBLiveFeed object or null

  const [hudFilter, setHudFilter] = useState('standard'); // 'standard' | 'night' | 'thermal'
  const [radioActive, setRadioActive] = useState(false);
  
  // Real camera & WebRTC states
  const [cameraStream, setCameraStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteFrame, setRemoteFrame] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isWatchingLive, setIsWatchingLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('IDLE');
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [activeFeedId, setActiveFeedId] = useState(null);  // backend DBLiveFeed.id for current broadcast
  const [activeBroadcastRoomId, setActiveBroadcastRoomId] = useState(''); // exact PeerJS ID currently assigned
  const [customRoomInput, setCustomRoomInput] = useState('');

  // ── GPS state ─────────────────────────────────────────────────────────────
  // Responder identity (needed to PATCH location to the right DB record)
  const [responderId, setResponderId]         = useState('');    // DB UUID from backend
  const [responderIdInput, setResponderIdInput] = useState('');  // input field value

  // Real GPS tracking state
  const [gpsActive, setGpsActive]       = useState(false);
  const [gpsStatus, setGpsStatus]       = useState('IDLE');   // 'IDLE'|'ACQUIRING'|'TRACKING'|'ERROR'|'NOT_SUPPORTED'
  const [gpsError, setGpsError]         = useState(null);     // error code string
  const [gpsPosition, setGpsPosition]   = useState(null);     // latest { latitude, longitude, accuracy, heading, speed, timestamp }
  const gpsCleanupRef = useRef(null);   // stores the clearWatch wrapper returned by gpsTracker.start()

  const handleStartGPS = useCallback(() => {
    if (!responderId.trim()) {
      alert('Enter your Responder ID (from the backend) before enabling GPS tracking.');
      return;
    }
    if (gpsActive) return;

    setGpsStatus('ACQUIRING');
    setGpsError(null);

    const stopFn = gpsTracker.start(
      responderId.trim(),
      (pos) => {
        setGpsPosition(pos);
        setGpsStatus('TRACKING');
        setGpsError(null);
      },
      (errCode) => {
        setGpsStatus(errCode === 'GPS_NOT_SUPPORTED' ? 'NOT_SUPPORTED' : 'ERROR');
        setGpsError(errCode);
      },
    );

    gpsCleanupRef.current = stopFn;
    setGpsActive(true);
  }, [responderId, gpsActive]);

  const handleStopGPS = useCallback(() => {
    if (gpsCleanupRef.current) {
      gpsCleanupRef.current();  // calls clearWatch() internally
      gpsCleanupRef.current = null;
    }
    setGpsActive(false);
    setGpsStatus('IDLE');
    setGpsPosition(null);
    setGpsError(null);
  }, []);

  // Cleanup GPS on component unmount
  useEffect(() => {
    return () => {
      if (gpsCleanupRef.current) {
        gpsCleanupRef.current();   // clearWatch()
        gpsCleanupRef.current = null;
      }
    };
  }, []);

  // Approach telemetry — keep the simulated visual as before (does NOT send to backend)
  const [simulatedDistance, setSimulatedDistance] = useState(2.4);
  const [simulatedEta, setSimulatedEta] = useState(6);

  // Approach distance simulation countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedDistance(prev => {
        if (prev <= 0.1) return 0.05;
        return parseFloat((prev - 0.05).toFixed(2));
      });
      setSimulatedEta(prev => {
        if (prev <= 1) return 1;
        return prev;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const jitsiContainerRef = useRef(null);

  const incident = activeResponderIncident || incidents[0];
  const prioConf = PRIORITY_CONFIG[incident?.priority] || SEVERITY_CONFIG[incident?.severity] || PRIORITY_CONFIG.P1;
  const defaultRoomId = incident ? liveStreamService.getRoomName(incident.id) : 'resqmap-emergency-hub';
  const displayRoomId = activeBroadcastRoomId || defaultRoomId;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      liveStreamService.destroy();
    };
  }, []);

  // Start Broadcasting from this device's camera (Responder role)
  const handleStartBroadcast = async () => {
    try {
      setConnectionStatus('CONNECTING');
      setStreamMode('broadcast');
      setIsBroadcasting(true);
      setIsWatchingLive(false);

      const meta = {
        responderId: responderId || null,
        latitude:    gpsPosition?.latitude  ?? null,
        longitude:   gpsPosition?.longitude ?? null,
      };

      // Slight timeout to ensure container DOM element is mounted
      setTimeout(async () => {
        if (!jitsiContainerRef.current) return;
        const result = await liveStreamService.startBroadcast(
          jitsiContainerRef.current,
          incident.id,
          (count) => { setViewerCount(Math.max(0, count)); },
          meta
        );

        setActiveFeedId(result?.feedId ?? null);
        setActiveBroadcastRoomId(result?.roomName ?? defaultRoomId);
        setConnectionStatus('LIVE_BROADCASTING');
      }, 100);
    } catch (err) {
      console.warn('Could not start camera broadcast:', err);
      alert('Camera or microphone permission denied or unavailable.');
      setStreamMode('idle');
      setIsBroadcasting(false);
      setActiveFeedId(null);
      setActiveBroadcastRoomId('');
      setConnectionStatus('ERROR');
    }
  };

  // Stop Broadcasting
  const handleStopBroadcast = () => {
    liveStreamService.stopBroadcast();
    setIsBroadcasting(false);
    setActiveFeedId(null);
    setActiveBroadcastRoomId('');
    setStreamMode('idle');
    setConnectionStatus('IDLE');
    setViewerCount(0);
  };

  // Watch a colleague's live stream by Feed or direct Room ID
  const handleWatchFeed = async (feedToWatch = null) => {
    const targetFeed = feedToWatch || selectedFeed || (activeFeeds.length > 0 ? activeFeeds[0] : null);
    const targetRoomId = targetFeed?.peer_room_id || defaultRoomId;
    try {
      setConnectionStatus('CONNECTING_PEER');
      setStreamMode('watch');
      setIsWatchingLive(true);
      setIsBroadcasting(false);
      if (targetFeed) setSelectedFeed(targetFeed);

      setTimeout(async () => {
        if (!jitsiContainerRef.current) return;
        await liveStreamService.watchBroadcast(
          jitsiContainerRef.current,
          targetRoomId,
          (count) => { setViewerCount(Math.max(0, count)); }
        );
        setConnectionStatus('CONNECTED_WATCHING');
      }, 100);
    } catch (err) {
      console.warn('Could not connect to feed:', err);
      setConnectionStatus('FAILED');
    }
  };

  // Join custom room ID entered by user
  const handleJoinCustomRoom = async (roomIdToJoin = customRoomInput) => {
    if (!roomIdToJoin || !roomIdToJoin.trim()) return;
    const targetRoom = roomIdToJoin.trim();
    try {
      setConnectionStatus('CONNECTING_PEER');
      setStreamMode('watch');
      setIsWatchingLive(true);
      setIsBroadcasting(false);
      setSelectedFeed(null);

      setTimeout(async () => {
        if (!jitsiContainerRef.current) return;
        await liveStreamService.watchBroadcast(
          jitsiContainerRef.current,
          targetRoom,
          (count) => { setViewerCount(Math.max(0, count)); }
        );
        setConnectionStatus('CONNECTED_WATCHING');
      }, 100);
    } catch (err) {
      console.warn('Could not connect to room:', err);
      setConnectionStatus('FAILED');
    }
  };

  // Legacy "Watch Colleague Feed" button (joins active or incident-derived room)
  const handleWatchColleagueStream = () => {
    const feed = activeFeeds.length > 0 ? activeFeeds[0] : null;
    handleWatchFeed(feed);
  };

  // Disconnect watching
  const handleDisconnectWatcher = () => {
    liveStreamService.disconnectWatcher();
    setIsWatchingLive(false);
    setSelectedFeed(null);
    setStreamMode('idle');
    setConnectionStatus('IDLE');
    setViewerCount(0);
  };

  const handleCopyRoomLink = () => {
    const code = displayRoomId;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code);
    }
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2000);
  };

  const handleRadioBeep = () => {
    setRadioActive(true);
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
    setTimeout(() => setRadioActive(false), 800);
  };

  const handleStatusUpdate = (status) => {
    if (status === 'RESOLVED') {
      confetti({ particleCount: 70, spread: 60 });
    }
    updateIncidentStatus(incident.id, status);
  };

  return (
    <div className="space-y-4">
      {/* Top Incident Target Banner */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${prioConf.bg} ${prioConf.color} border ${prioConf.border}`}>
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400 font-bold">{incident?.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${prioConf.badge}`}>
                {incident?.priority || 'P1'} · {prioConf.label}
              </span>
              <span className="text-xs text-sky-400 font-bold font-mono">
                Assigned: {incident?.assignedUnit || 'Disaster Rescue Unit 17'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Live Responder Stream: {incident?.title}
            </h2>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              {incident?.address} ({incident?.latitude.toFixed(4)}, {incident?.longitude.toFixed(4)})
            </p>
          </div>
        </div>

        {/* Target Switcher & Live Room Badge */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
            <Cast className="w-3.5 h-3.5 text-sky-400" />
            <span>Room: <b className="text-sky-300">{displayRoomId}</b></span>
            <button
              onClick={handleCopyRoomLink}
              title="Copy Room ID for Colleagues"
              className="p-1 hover:text-white text-slate-400 flex items-center gap-1"
            >
              {copiedRoomId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <select
            value={incident?.id}
            onChange={e => {
              const found = incidents.find(i => i.id === e.target.value);
              if (found) setActiveResponderIncident(found);
            }}
            className="bg-slate-900 text-xs text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
          >
            {incidents.filter(i => i.isRealDisaster).map(inc => (
              <option key={inc.id} value={inc.id}>
                {inc.id} - {inc.hazardCategory.split('/')[0]} ({inc.priority || inc.severity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tactical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2 Cols: Live Video HUD Stream */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-[#1f293d] bg-black aspect-video flex items-center justify-center shadow-2xl">
          
          {/* Active Live Video Stream Container (Enterprise Jitsi WebRTC) */}
          <div
            ref={jitsiContainerRef}
            className={`w-full h-full ${streamMode === 'idle' ? 'hidden' : 'block'} ${
              hudFilter === 'night' ? 'brightness-125 contrast-150 hue-rotate-90 saturate-200' :
              hudFilter === 'thermal' ? 'invert contrast-200 saturate-200' : ''
            }`}
          />

          {/* Mode: Idle — no active stream, prompt to select a feed or broadcast */}
          {streamMode === 'idle' && (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 w-full h-full">
              <Tv className="w-10 h-10 text-slate-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-300">No Active Stream</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Select a live feed from the discovery panel, or start broadcasting from your camera.
                </p>
              </div>
              {activeFeeds.length > 0 && (
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 px-3 py-1 rounded-full border border-emerald-600/40 animate-pulse">
                  {activeFeeds.length} LIVE FEED{activeFeeds.length !== 1 ? 'S' : ''} AVAILABLE ↓
                </span>
              )}
            </div>
          )}

          {/* Tactical HUD Scanline & Crosshair Overlay */}
          <div className="absolute inset-0 pointer-events-none border border-sky-500/20 tactical-scanline">
            
            {/* Corner Bracket Reticles */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-400"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-400"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-400"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-400"></div>

            {/* Center Crosshair Target Vector */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-16 h-16 border border-sky-400/40 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '10s' }}>
                <div className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Top Telemetry Bar */}
            <div className="absolute top-4 left-10 right-10 flex items-center justify-between font-mono text-[11px] text-sky-400 drop-shadow">
              <div className="flex items-center gap-2 bg-black/70 px-2.5 py-1 rounded border border-sky-500/30 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span className="font-bold uppercase tracking-wider text-rose-300">
                  {streamMode === 'broadcast' ? '🔴 YOU ARE BROADCASTING LIVE' :
                   streamMode === 'watch' ? '📡 WATCHING LIVE FEED' :
                   'NO ACTIVE STREAM — STANDBY'}
                </span>
                {isBroadcasting && (
                  <span className="text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                    <Users className="w-3 h-3 inline mr-1" />{viewerCount} Viewers
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 bg-black/70 px-2.5 py-1 rounded border border-sky-500/30 backdrop-blur-sm">
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-400" /> WEBRTC P2P</span>
                <span>LATENCY: <b>28ms</b></span>
                <span>FPS: <b>60</b></span>
              </div>
            </div>

            {/* Bottom Target Vector Telemetry */}
            <div className="absolute bottom-4 left-10 right-10 flex items-end justify-between font-mono text-xs drop-shadow">
              <div className="bg-black/80 p-2.5 rounded-xl border border-sky-500/40 text-slate-200 backdrop-blur-md space-y-1">
                <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3 animate-spin" /> TARGET VECTOR
                </div>
                <div className="text-sm font-black text-white font-mono">
                  DISTANCE: <span className="text-amber-400">{simulatedDistance} KM</span> | ETA: <span className="text-emerald-400">{simulatedEta} MINS</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  BEARING: <b>{gpsPosition?.heading != null ? `${gpsPosition.heading.toFixed(1)}°` : '—'}</b> | SPEED: <b>{gpsPosition?.speed != null ? `${(gpsPosition.speed * 3.6).toFixed(1)} km/h` : '—'}</b>
                </div>
              </div>

              {/* Radio Indicator */}
              {radioActive && (
                <div className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold font-mono animate-bounce flex items-center gap-1.5 shadow-lg shadow-rose-900">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>DISPATCH AUDIO TRANSMITTING...</span>
                </div>
              )}
            </div>
          </div>

          {/* Top Right Live Stream Switcher Buttons */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            
            {/* Broadcaster Toggle */}
            {streamMode !== 'broadcast' ? (
              <button
                onClick={handleStartBroadcast}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-900/50 border border-rose-400/40 transition-all active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Broadcast My Live Camera</span>
              </button>
            ) : (
              <button
                onClick={handleStopBroadcast}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-950 text-rose-300 border border-rose-600 hover:bg-rose-900"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Stop Broadcast</span>
              </button>
            )}

            {/* Watch Colleague Toggle */}
            {streamMode !== 'watch' ? (
              <button
                onClick={handleWatchColleagueStream}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/50 border border-sky-400/40"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Watch Colleague Feed</span>
              </button>
            ) : (
              <button
                onClick={handleDisconnectWatcher}
                className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Exit Watcher</span>
              </button>
            )}
          </div>

          {/* Bottom Filter Selector */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-slate-700">
            {['standard', 'night', 'thermal'].map(mode => (
              <button
                key={mode}
                onClick={() => setHudFilter(mode)}
                className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold transition-all ${
                  hudFilter === mode ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Right Col: Mission Controls, Colleague Peer Info & Triage */}
        <div className="space-y-4">
          
          {/* Mission Status Controller */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-sky-400" />
                Responder Mission Status
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                incident?.status === 'RESOLVED' ? 'bg-emerald-900 text-emerald-300' : 'bg-sky-900 text-sky-300'
              }`}>
                {incident?.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {['DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => handleStatusUpdate(st)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    incident?.status === st
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {st === 'RESOLVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
                  <span>{st.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            {/* Roger Beep Comms */}
            <button
              onClick={handleRadioBeep}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Radio className="w-4 h-4 text-sky-400" />
              <span>Broadcast Tactical Roger Beep</span>
            </button>
          </div>

          {/* Multi-Peer Colleague Broadcast Status Box */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Cast className="w-4 h-4 text-sky-400" />
              Multi-Device Live Stream Hub
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When a responder starts broadcasting on their phone, any team member or commander on another phone/laptop can tap <b>"Watch Colleague Feed"</b> or join by Room Code to view the live camera feed in real-time over WebRTC.
            </p>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Stream Status:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {isBroadcasting ? `🔴 Broadcasting (${viewerCount} Connected)` :
                   isWatchingLive ? `📡 Watching Colleague` :
                   `Standby`}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 text-[11px]">Active Room Code:</span>
                <div className="flex items-center gap-1.5 font-mono text-sky-300 font-bold text-[11px]">
                  <span>{displayRoomId}</span>
                  <button
                    onClick={handleCopyRoomLink}
                    title="Copy Room ID"
                    className="p-1 hover:text-white text-slate-400"
                  >
                    {copiedRoomId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Room Code Input & Join */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400">Join Room by Code:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. resqnet-rqn1042"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => handleJoinCustomRoom(customRoomInput)}
                  disabled={!customRoomInput.trim()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Join</span>
                </button>
              </div>
            </div>

            {activeFeedId && (
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-700/30 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                <span className="text-slate-400">Feed ID (backend):</span>
                <span className="truncate max-w-[140px]" title={activeFeedId}>{activeFeedId.substring(0, 8)}…</span>
              </div>
            )}
          </div>

          {/* ── Live-Feed Discovery Panel ──────────────────────────────── */}
          {/* Shows ONLY real feeds discovered from GET /api/feeds + WebSocket events.
              No hardcoded feed IDs, no fake responder names, no fake status. */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-sky-400" />
                Live Feed Discovery
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                activeFeeds.length > 0
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/40'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}>
                {activeFeeds.length} LIVE
              </span>
            </div>

            {activeFeeds.length === 0 ? (
              <div className="text-center py-5 space-y-1">
                <VideoOff className="w-7 h-7 text-slate-700 mx-auto" />
                <p className="text-[11px] text-slate-500 font-medium">NO ACTIVE LIVE FEEDS</p>
                <p className="text-[10px] text-slate-600">
                  When a responder starts broadcasting, their feed will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeFeeds.map(feed => {
                  const isSelected = selectedFeed?.id === feed.id && streamMode === 'watch';
                  const statusColor =
                    feed.status === 'LIVE'         ? 'text-emerald-400 bg-emerald-950/50 border-emerald-700/40' :
                    feed.status === 'STARTING'     ? 'text-amber-400 bg-amber-950/50 border-amber-700/40 animate-pulse' :
                    feed.status === 'RECONNECTING' ? 'text-sky-400 bg-sky-950/50 border-sky-700/40 animate-pulse' :
                                                     'text-slate-400 bg-slate-800 border-slate-700';
                  return (
                    <div
                      key={feed.id}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-600/50'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      {/* Feed header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Video className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                          <span className="font-mono text-[10px] text-slate-400 truncate">
                            {feed.peer_room_id || feed.id?.substring(0, 12) + '…'}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ml-1 ${statusColor}`}>
                          {feed.status}
                        </span>
                      </div>

                      {/* Feed metadata */}
                      <div className="space-y-0.5 text-[10px] text-slate-400 font-mono mb-2">
                        {feed.responder_id && (
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            <span className="truncate">
                              Responder: <span className="text-slate-300">{feed.responder_id.substring(0, 8)}…</span>
                            </span>
                          </div>
                        )}
                        {(feed.latitude != null && feed.longitude != null) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                            <span className="text-slate-300">
                              {feed.latitude.toFixed(4)}, {feed.longitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                        {feed.started_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <span className="text-slate-500">
                              {new Date(feed.started_at).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Watch button */}
                      {isSelected ? (
                        <button
                          onClick={handleDisconnectWatcher}
                          className="w-full py-1.5 text-[10px] font-bold rounded-lg bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center gap-1"
                        >
                          <VideoOff className="w-3 h-3" /> Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleWatchFeed(feed)}
                          className="w-full py-1.5 text-[10px] font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Watch Feed
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Real GPS Tracking Panel ─────────────────────────────────── */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <LocateFixed className="w-4 h-4 text-emerald-400" />
              Real GPS Tracking
              <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                gpsStatus === 'TRACKING'      ? 'bg-emerald-900 text-emerald-300' :
                gpsStatus === 'ACQUIRING'     ? 'bg-amber-900  text-amber-300 animate-pulse' :
                gpsStatus === 'ERROR'         ? 'bg-rose-900   text-rose-300' :
                gpsStatus === 'NOT_SUPPORTED' ? 'bg-slate-800  text-slate-400' :
                                               'bg-slate-800  text-slate-400'
              }`}>
                {gpsStatus}
              </span>
            </h3>

            {/* GPS Source + Status summary row */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
                <div className="text-slate-500 uppercase tracking-wider font-semibold">GPS Source</div>
                <div className="text-slate-200 flex items-center gap-1">
                  <Satellite className="w-3 h-3 text-sky-400 flex-shrink-0" />
                  Browser GPS
                </div>
                <div className="text-slate-600 text-[9px]">navigator.geolocation</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-0.5">
                <div className="text-slate-500 uppercase tracking-wider font-semibold">GPS Status</div>
                <div className={`font-bold ${
                  gpsStatus === 'TRACKING'      ? 'text-emerald-400' :
                  gpsStatus === 'ACQUIRING'     ? 'text-amber-400' :
                  gpsStatus === 'ERROR'         ? 'text-rose-400' :
                  gpsStatus === 'NOT_SUPPORTED' ? 'text-slate-500' :
                                                 'text-slate-500'
                }`}>
                  {gpsStatus === 'IDLE'          ? 'UNAVAILABLE' :
                   gpsStatus === 'NOT_SUPPORTED' ? 'UNSUPPORTED' :
                   gpsStatus}
                </div>
                {gpsPosition?.accuracy != null && (
                  <div className="text-slate-500 text-[9px]">±{gpsPosition.accuracy.toFixed(0)} m accuracy</div>
                )}
              </div>
            </div>

            {/* Responder ID input */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Your Responder DB ID (required to persist location)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste UUID from /api/responders"
                  value={responderIdInput}
                  onChange={e => setResponderIdInput(e.target.value)}
                  disabled={gpsActive}
                  className="flex-1 bg-slate-900 text-xs text-white px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-600 disabled:opacity-50"
                />
                <button
                  onClick={() => setResponderId(responderIdInput.trim())}
                  disabled={gpsActive || !responderIdInput.trim()}
                  className="px-3 py-2 text-[10px] font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 whitespace-nowrap"
                >
                  Set ID
                </button>
              </div>
              {responderId && (
                <p className="text-[10px] text-emerald-400 font-mono truncate">
                  ✓ ID set: {responderId}
                </p>
              )}
            </div>

            {/* Start / Stop GPS */}
            <div className="flex gap-2">
              {!gpsActive ? (
                <button
                  onClick={handleStartGPS}
                  className="flex-1 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/40 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  Enable Real GPS
                </button>
              ) : (
                <button
                  onClick={handleStopGPS}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                >
                  <LocateOff className="w-3.5 h-3.5" />
                  Stop GPS (clearWatch)
                </button>
              )}
            </div>

            {/* GPS error message */}
            {gpsError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-700/40 text-rose-300 text-[11px] font-mono flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {gpsError === 'PERMISSION_DENIED'   && 'GPS permission denied. Allow location in browser settings.'}
                  {gpsError === 'POSITION_UNAVAILABLE' && 'GPS signal unavailable. Move to open area.'}
                  {gpsError === 'TIMEOUT'              && 'GPS timeout. Signal too weak — retrying…'}
                  {gpsError === 'GPS_NOT_SUPPORTED'    && 'This browser does not support Geolocation API.'}
                  {!['PERMISSION_DENIED','POSITION_UNAVAILABLE','TIMEOUT','GPS_NOT_SUPPORTED'].includes(gpsError) && gpsError}
                </span>
              </div>
            )}

            {/* Live position readout */}
            {gpsPosition ? (
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Latitude</span>
                  <span className="text-white font-bold">{gpsPosition.latitude.toFixed(6)}°</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Longitude</span>
                  <span className="text-white font-bold">{gpsPosition.longitude.toFixed(6)}°</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Signal className="w-3 h-3" /> Accuracy
                  </span>
                  <span className={`font-bold ${
                    gpsPosition.accuracy != null && gpsPosition.accuracy < 15  ? 'text-emerald-400' :
                    gpsPosition.accuracy != null && gpsPosition.accuracy < 50  ? 'text-amber-400' :
                                                                                  'text-rose-400'
                  }`}>
                    {gpsPosition.accuracy != null ? `±${gpsPosition.accuracy.toFixed(0)} m` : 'N/A'}
                  </span>
                </div>
                {gpsPosition.heading != null && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> Heading
                    </span>
                    <span className="text-sky-300 font-bold">{gpsPosition.heading.toFixed(1)}°</span>
                  </div>
                )}
                {gpsPosition.speed != null && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Speed</span>
                    <span className="text-sky-300 font-bold">{(gpsPosition.speed * 3.6).toFixed(1)} km/h</span>
                  </div>
                )}
                <p className="text-slate-600 text-[9px] text-right pt-0.5">
                  Last fix: {new Date(gpsPosition.timestamp).toLocaleTimeString()}
                  {' · '}
                  {responderId ? 'Syncing to backend ✓' : 'Set Responder ID to sync'}
                </p>
              </div>
            ) : gpsStatus === 'ACQUIRING' ? (
              <div className="text-center py-3 text-slate-400 text-[11px] animate-pulse flex items-center justify-center gap-2">
                <Satellite className="w-4 h-4 text-amber-400" />
                Acquiring GPS signal… hold still outdoors
              </div>
            ) : gpsStatus === 'IDLE' ? (
              <p className="text-center text-slate-600 text-[11px] py-2">
                Enable GPS to track your real device location.
              </p>
            ) : null}
          </div>

          {/* Victim Urgency Alert Box */}
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl p-4 shadow-xl space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Victim Triage Checklist
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Trapped Individuals:</span>
                <span className="font-bold text-rose-400 font-mono">{incident?.trappedCount || 0} Citizens</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Specialized Team:</span>
                <span className="font-bold text-sky-400">
                  {incident?.assignedUnit || 'Disaster Rescue Unit 17'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedIncident(incident)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Open Full Incident Inspector Drawer</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
