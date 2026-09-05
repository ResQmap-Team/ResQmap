import Peer from 'peerjs';
import { apiClient } from './api';

/**
 * ResQNet Ultra-Reliable Peer-to-Peer Live Video Broadcast Service using WebRTC (PeerJS)
 * Supports cross-network live streaming between 4G/5G mobile phones, laptops, and command centers
 * with dual-handshake signaling (DataConnection request + MediaCall return) and heartbeat keepalive.
 */

const ICE_SERVERS_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

const PEER_BASE_CONFIG = {
  debug: 1,
  pingInterval: 5000, // 5s heartbeat keeps 4G/5G cellular NAT bindings alive
  config: ICE_SERVERS_CONFIG
};

/**
 * Creates an active dummy media stream for viewer offer fallback
 */
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
    this.remoteStream    = null;
    this.isBroadcasting  = false;
    this.isWatching      = false;
    this.broadcastRoomId = null;
    this.dummyStream     = null;
    this.retryTimer      = null;
    this._activeFeedId   = null;
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

      this.peer = new Peer(roomId, PEER_BASE_CONFIG);

      // Handler for direct viewer media calls (Viewer -> Broadcaster)
      const handleIncomingCall = (call) => {
        console.log(`[Broadcaster] Incoming direct media call from ${call.peer}`);
        call.answer(this.localStream);
        this._trackActiveCall(call, onViewerJoined);
      };

      // Handler for viewer data connections (Dual-handshake: Viewer requests stream -> Broadcaster calls Viewer)
      const handleDataConnection = (conn) => {
        console.log(`[Broadcaster] Incoming data connection from viewer: ${conn.peer}`);
        
        const initiateMediaCallToViewer = () => {
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
          initiateMediaCallToViewer();
        });

        conn.on('data', (data) => {
          if (data && data.type === 'REQUEST_STREAM') {
            initiateMediaCallToViewer();
          }
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
          console.info(`[LiveStream] Feed registered → feedId=${this._activeFeedId}`);
        } catch (err) {
          console.warn('[LiveStream] Feed registration failed (non-fatal):', err);
          this._activeFeedId = null;
        }

        resolve({ roomId: id, isHost: true, feedId: this._activeFeedId });
      });

      this.peer.on('call', handleIncomingCall);
      this.peer.on('connection', handleDataConnection);

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] PeerJS broadcaster error:', err);
        if (err.type === 'unavailable-id') {
          console.info('[LiveStream] Room ID already in use, generating randomized suffix.');
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
   * Join and watch an arbitrary room ID directly (Dual-Handshake approach)
   */
  joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange = null) {
    return new Promise((resolve, reject) => {
      this.disconnectWatcher();

      const cleanRoomId = targetRoomId.trim();
      this.isWatching = true;

      this.peer = new Peer(PEER_BASE_CONFIG);

      let streamReceived = false;

      const handleIncomingStream = (incomingStream) => {
        if (!incomingStream || streamReceived) return;
        streamReceived = true;
        console.log('[LiveStream] Successfully connected to live stream!', incomingStream);
        this.remoteStream = incomingStream;
        if (onStreamReceived) onStreamReceived(incomingStream);
        if (onConnectionChange) onConnectionChange('CONNECTED');
        if (this.retryTimer) {
          clearInterval(this.retryTimer);
          this.retryTimer = null;
        }
      };

      // Listener 1: Broadcaster calls viewer back with real camera stream
      this.peer.on('call', (incomingCall) => {
        console.log('[Viewer] Broadcaster called us with camera stream! Answering...');
        incomingCall.answer(); // Pure receiver - answers cleanly
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
        console.log(`[Viewer] Active (${myId}), connecting to broadcaster room (${cleanRoomId})...`);

        const attemptConnect = () => {
          if (streamReceived || !this.isWatching || !this.peer) return;

          try {
            // Path A: Open DataConnection to ask broadcaster to call us
            console.log(`[Viewer] Signaling stream request to ${cleanRoomId}...`);
            const conn = this.peer.connect(cleanRoomId, { reliable: true });
            conn.on('open', () => {
              console.log('[Viewer] Data channel opened with broadcaster, requesting feed...');
              conn.send({ type: 'REQUEST_STREAM', viewerId: myId });
            });

            // Path B: Simultaneous direct media call with active dummy stream
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

        // Initial attempt
        attemptConnect();

        // Retry every 3.5 seconds if stream is not yet established
        this.retryTimer = setInterval(() => {
          if (!streamReceived && this.isWatching) {
            console.log('[Viewer] Retrying connection to broadcaster...');
            attemptConnect();
          } else {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
          }
        }, 3500);

        resolve(this.peer);
      });

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] Viewer peer error:', err);
        if (err.type === 'peer-unavailable') {
          console.warn('[LiveStream] Broadcaster peer is not reachable yet.');
        }
      });
    });
  }

  /**
   * Join and watch a colleague's live broadcast by Incident ID
   */
  joinBroadcast(incidentId, onStreamReceived, onConnectionChange = null) {
    const targetRoomId = this.getPeerRoomId(incidentId);
    return this.joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange);
  }

  /**
   * Stop the broadcast and mark the backend feed record as ENDED.
   */
  stopBroadcast() {
    this.isBroadcasting = false;
    this.broadcastRoomId = null;
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
      apiClient.updateFeed(feedId, { status: 'ENDED' }).then(() => {
        console.info(`[LiveStream] Feed ${feedId} marked ENDED.`);
      }).catch((err) => {
        console.warn('[LiveStream] Failed to mark feed ENDED:', err);
      });
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
