import Peer from 'peerjs';
import { apiClient } from './api';

/**
 * ResQNet Ultra-Reliable Peer-to-Peer Live Video Broadcast Service
 * Dual-Engine Architecture:
 * 1. High-Performance WebRTC Stream (60 FPS Native Audio/Video)
 * 2. Instant Live Frame DataChannel Stream (12 FPS Real-Time Fallback for VPNs / Strict Firewalls)
 */

const RELIABLE_STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' }
  ],
  iceCandidatePoolSize: 10
};

const PEER_BASE_CONFIG = {
  debug: 1,
  pingInterval: 5000,
  config: RELIABLE_STUN_SERVERS
};

function createActiveDummyStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  let tick = 0;
  const timer = setInterval(() => {
    tick = (tick + 1) % 255;
    if (ctx) {
      ctx.fillStyle = `rgb(${tick}, 20, 20)`;
      ctx.fillRect(0, 0, 16, 16);
    }
  }, 250);

  const stream = canvas.captureStream ? canvas.captureStream(10) : canvas.mozCaptureStream(10);

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const audioTrack = dst.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
      stream._audioCtx = audioCtx;
    }
  } catch (e) {}

  stream._timer = timer;
  return stream;
}

function stopDummyStream(stream) {
  if (!stream) return;
  if (stream._timer) clearInterval(stream._timer);
  if (stream._audioCtx) {
    try { stream._audioCtx.close(); } catch (e) {}
  }
  try {
    stream.getTracks().forEach(t => t.stop());
  } catch (e) {}
}

class LiveStreamManager {
  constructor() {
    this.peer            = null;
    this.localStream     = null;
    this.activeCalls     = [];
    this.activeDataConns = [];
    this.remoteStream    = null;
    this.isBroadcasting  = false;
    this.isWatching      = false;
    this.broadcastRoomId = null;
    this.dummyStream     = null;
    this.retryTimer      = null;
    this.framePumpTimer  = null;
    this._activeFeedId   = null;
    this.snapCanvas      = document.createElement('canvas');
    this.snapVideo       = document.createElement('video');
    this.snapVideo.muted = true;
    this.snapVideo.playsInline = true;
  }

  getPeerRoomId(incidentId) {
    if (!incidentId) return 'resqnet-stream';
    const clean = incidentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `resqnet-${clean}`;
  }

  getActiveFeedId() {
    return this._activeFeedId;
  }

  getBroadcastRoomId() {
    return this.broadcastRoomId;
  }

  /**
   * Start broadcasting local camera stream to the internet.
   */
  startBroadcast(incidentId, stream, onViewerJoined = null, meta = {}) {
    return new Promise((resolve, reject) => {
      this.stopBroadcast();

      const roomId = this.getPeerRoomId(incidentId);
      this.broadcastRoomId = roomId;
      this.localStream     = stream;
      this.isBroadcasting  = true;

      // Attach local stream to hidden video element for snapshot extraction
      this.snapVideo.srcObject = stream;
      this.snapVideo.play().catch(() => {});

      // Start frame pump (10-12 FPS) for instant data channel fallback
      this.framePumpTimer = setInterval(() => {
        if (!this.isBroadcasting || this.activeDataConns.length === 0) return;
        if (this.snapVideo.videoWidth > 0 && this.snapVideo.videoHeight > 0) {
          const w = 480;
          const h = Math.round((this.snapVideo.videoHeight / this.snapVideo.videoWidth) * 480) || 270;
          this.snapCanvas.width = w;
          this.snapCanvas.height = h;
          const ctx = this.snapCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(this.snapVideo, 0, 0, w, h);
            const frameJpeg = this.snapCanvas.toDataURL('image/jpeg', 0.55);
            const msg = JSON.stringify({ type: 'LIVE_FRAME', frame: frameJpeg, t: Date.now() });
            this.activeDataConns.forEach(conn => {
              if (conn && conn.open) {
                try { conn.send(msg); } catch (e) {}
              }
            });
          }
        }
      }, 90);

      this.peer = new Peer(roomId, PEER_BASE_CONFIG);

      const handleIncomingCall = (call) => {
        console.log(`[Broadcaster] Incoming media call from ${call.peer}`);
        call.answer(this.localStream);
        this._trackActiveCall(call, onViewerJoined);
      };

      const handleDataConnection = (conn) => {
        console.log(`[Broadcaster] Incoming data connection from viewer: ${conn.peer}`);
        if (!this.activeDataConns.includes(conn)) {
          this.activeDataConns.push(conn);
        }

        const callViewer = () => {
          if (!this.localStream || !this.peer) return;
          console.log(`[Broadcaster] Calling viewer ${conn.peer} with local stream...`);
          try {
            const outCall = this.peer.call(conn.peer, this.localStream);
            if (outCall) {
              this._trackActiveCall(outCall, onViewerJoined);
            }
          } catch (e) {
            console.warn('[Broadcaster] Failed calling viewer peer:', e);
          }
        };

        conn.on('open', () => {
          console.log(`[Broadcaster] Data channel open with ${conn.peer}`);
          callViewer();
        });

        conn.on('data', (data) => {
          if (typeof data === 'string') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'REQUEST_STREAM') callViewer();
            } catch (e) {}
          } else if (data && data.type === 'REQUEST_STREAM') {
            callViewer();
          }
        });

        conn.on('close', () => {
          this.activeDataConns = this.activeDataConns.filter(c => c !== conn);
        });
      };

      this.peer.on('open', async (id) => {
        console.log(`[LiveStream] Broadcast online with Room ID: ${id}`);
        this.broadcastRoomId = id;

        try {
          const feedPayload = {
            peer_room_id: id,
            incident_id:  incidentId || '',
            responder_id: meta.responderId || null,
            latitude:     meta.latitude    ?? null,
            longitude:    meta.longitude   ?? null,
          };
          const feedRecord = await apiClient.registerFeed(feedPayload);
          this._activeFeedId = feedRecord?.id ?? null;

          if (this._activeFeedId) {
            await apiClient.updateFeed(this._activeFeedId, { status: 'LIVE' }).catch(() => {});
          }
        } catch (err) {
          this._activeFeedId = null;
        }

        resolve({ roomId: id, isHost: true, feedId: this._activeFeedId });
      });

      this.peer.on('call', handleIncomingCall);
      this.peer.on('connection', handleDataConnection);

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] PeerJS broadcaster error:', err);
        if (err.type === 'unavailable-id') {
          const randomId = `${roomId}-${Math.floor(100 + Math.random() * 900)}`;
          this.peer = new Peer(randomId, PEER_BASE_CONFIG);
          this.peer.on('open', async (newId) => {
            this.broadcastRoomId = newId;
            try {
              const feedRecord = await apiClient.registerFeed({
                peer_room_id: newId,
                incident_id:  incidentId || '',
                responder_id: meta.responderId || null,
                latitude:     meta.latitude    ?? null,
                longitude:    meta.longitude   ?? null,
              });
              this._activeFeedId = feedRecord?.id ?? null;
              if (this._activeFeedId) {
                await apiClient.updateFeed(this._activeFeedId, { status: 'LIVE' }).catch(() => {});
              }
            } catch (e) {
              this._activeFeedId = null;
            }
            resolve({ roomId: newId, isHost: true, feedId: this._activeFeedId });
          });
          this.peer.on('call', handleIncomingCall);
          this.peer.on('connection', handleDataConnection);
        } else {
          reject(err);
        }
      });
    });
  }

  _trackActiveCall(call, onViewerJoined) {
    if (!this.activeCalls.includes(call)) {
      this.activeCalls.push(call);
    }
    if (onViewerJoined) onViewerJoined(this.activeCalls.length);

    call.on('close', () => {
      this.activeCalls = this.activeCalls.filter(c => c !== call);
      if (onViewerJoined) onViewerJoined(this.activeCalls.length);
    });
    call.on('error', () => {
      this.activeCalls = this.activeCalls.filter(c => c !== call);
      if (onViewerJoined) onViewerJoined(this.activeCalls.length);
    });
  }

  /**
   * Join and watch an arbitrary room ID directly
   */
  joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange = null, onFrameReceived = null) {
    return new Promise((resolve, reject) => {
      this.disconnectWatcher();

      const cleanRoomId = targetRoomId.trim();
      this.isWatching = true;

      this.peer = new Peer(PEER_BASE_CONFIG);

      let streamReceived = false;

      const handleIncomingStream = (incomingStream) => {
        if (!incomingStream || streamReceived) return;
        streamReceived = true;
        console.log('[LiveStream] Received full WebRTC video stream!', incomingStream);
        this.remoteStream = incomingStream;
        if (onStreamReceived) onStreamReceived(incomingStream);
        if (onConnectionChange) onConnectionChange('CONNECTED');
        if (this.retryTimer) {
          clearInterval(this.retryTimer);
          this.retryTimer = null;
        }
      };

      // Listener for Broadcaster calling viewer back
      this.peer.on('call', (incomingCall) => {
        console.log('[Viewer] Broadcaster called us with media stream! Answering...');
        incomingCall.answer();
        incomingCall.on('stream', handleIncomingStream);
        if (incomingCall.peerConnection) {
          incomingCall.peerConnection.ontrack = (evt) => {
            if (evt.streams && evt.streams[0]) {
              handleIncomingStream(evt.streams[0]);
            }
          };
        }
      });

      this.peer.on('open', (myId) => {
        console.log(`[Viewer] Active (${myId}), connecting to room (${cleanRoomId})...`);

        const attemptConnect = () => {
          if (!this.isWatching || !this.peer) return;

          try {
            // Channel 1: Data Connection for frame sync & stream request
            const conn = this.peer.connect(cleanRoomId, { reliable: true });
            conn.on('open', () => {
              console.log('[Viewer] Data channel open with broadcaster!');
              if (onConnectionChange) onConnectionChange('CONNECTED');
              conn.send(JSON.stringify({ type: 'REQUEST_STREAM', viewerId: myId }));
            });

            conn.on('data', (rawMsg) => {
              try {
                const msg = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
                if (msg.type === 'LIVE_FRAME' && msg.frame) {
                  if (onFrameReceived) onFrameReceived(msg.frame);
                  if (onConnectionChange) onConnectionChange('CONNECTED');
                }
              } catch (e) {}
            });

            // Channel 2: Simultaneous direct media call
            if (!this.dummyStream) {
              this.dummyStream = createActiveDummyStream();
            }
            const outCall = this.peer.call(cleanRoomId, this.dummyStream);
            if (outCall) {
              outCall.on('stream', handleIncomingStream);
              if (outCall.peerConnection) {
                outCall.peerConnection.ontrack = (evt) => {
                  if (evt.streams && evt.streams[0]) {
                    handleIncomingStream(evt.streams[0]);
                  }
                };
              }
            }
          } catch (e) {
            console.warn('[Viewer] Connection attempt error:', e);
          }
        };

        attemptConnect();

        this.retryTimer = setInterval(() => {
          if (!streamReceived && this.isWatching) {
            console.log('[Viewer] Retrying connection...');
            attemptConnect();
          } else {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
          }
        }, 3000);

        resolve(this.peer);
      });

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] Viewer peer error:', err);
      });
    });
  }

  joinBroadcast(incidentId, onStreamReceived, onConnectionChange = null, onFrameReceived = null) {
    const targetRoomId = this.getPeerRoomId(incidentId);
    return this.joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange, onFrameReceived);
  }

  stopBroadcast() {
    this.isBroadcasting = false;
    this.broadcastRoomId = null;
    if (this.framePumpTimer) {
      clearInterval(this.framePumpTimer);
      this.framePumpTimer = null;
    }
    this.activeDataConns.forEach(conn => {
      try { conn.close(); } catch (e) {}
    });
    this.activeDataConns = [];
    this.activeCalls.forEach(call => {
      try { call.close(); } catch (e) {}
    });
    this.activeCalls = [];
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }

    if (this._activeFeedId) {
      const feedId = this._activeFeedId;
      this._activeFeedId = null;
      apiClient.updateFeed(feedId, { status: 'ENDED' }).catch(() => {});
    }
  }

  disconnectWatcher() {
    this.isWatching   = false;
    this.remoteStream = null;
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.dummyStream) {
      stopDummyStream(this.dummyStream);
      this.dummyStream = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
  }
}

export const liveStreamService = new LiveStreamManager();
