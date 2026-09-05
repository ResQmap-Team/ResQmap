import Peer from 'peerjs';
import { apiClient } from './api';

/**
 * ResQNet Peer-to-Peer Live Video Broadcast Service using WebRTC (PeerJS)
 * Allows First Responders to broadcast live bodycam / smartphone camera streams across the internet
 * to any colleague, dispatcher, or commander in real-time with sub-second latency.
 *
 * Feed metadata is registered with the backend (POST /api/feeds) when the PeerJS session
 * becomes active, and deregistered (PATCH /api/feeds/{id} → ENDED) when the stream stops.
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

/**
 * Creates an active, real-time media stream without requesting viewer camera/mic permissions.
 * Modern mobile/desktop browsers (WebKit/Blink) require actual frame activity and audio lines
 * to negotiate SDP and send media packets so the broadcaster receives the call and answers.
 */
function createActiveDummyStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  let tick = 0;
  // Continuously draw so captureStream emits active video frames
  const timer = setInterval(() => {
    tick = (tick + 1) % 255;
    if (ctx) {
      ctx.fillStyle = `rgb(${tick}, 20, 20)`;
      ctx.fillRect(0, 0, 16, 16);
    }
  }, 250);

  const stream = canvas.captureStream ? canvas.captureStream(10) : canvas.mozCaptureStream(10);

  // Add silent audio track so the SDP contains bidirectional audio/video lines
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // virtually silent
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const audioTrack = dst.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
      stream._audioCtx = audioCtx;
    }
  } catch (e) {
    console.warn('[LiveStream] Silent audio track creation fallback:', e);
  }

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

    // Backend feed record tracking
    this._activeFeedId   = null;   // DB id returned by POST /api/feeds
  }

  // Sanitize room ID for WebRTC peer names
  getPeerRoomId(incidentId) {
    if (!incidentId) return 'resqnet-stream';
    const clean = incidentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `resqnet-${clean}`;
  }

  /** Expose the current active feed ID (for UI display / debugging). */
  getActiveFeedId() {
    return this._activeFeedId;
  }

  /** Expose active broadcast room ID */
  getBroadcastRoomId() {
    return this.broadcastRoomId;
  }

  /**
   * Start broadcasting local camera stream to the internet.
   *
   * @param {string}   incidentId       - Incident the broadcast is associated with
   * @param {MediaStream} stream        - Real camera MediaStream from getUserMedia
   * @param {function} onViewerJoined   - Called with viewer count on every join/leave
   * @param {object}   [meta]           - Optional metadata for backend registration:
   *                                       { responderId, latitude, longitude }
   * @returns {Promise<{ roomId, isHost, feedId }>}
   */
  startBroadcast(incidentId, stream, onViewerJoined = null, meta = {}) {
    return new Promise((resolve, reject) => {
      this.stopBroadcast();

      const roomId = this.getPeerRoomId(incidentId);
      this.broadcastRoomId = roomId;
      this.localStream     = stream;
      this.isBroadcasting  = true;

      // Connect to free public PeerJS WebRTC signaling broker with full STUN/TURN config
      this.peer = new Peer(roomId, {
        debug: 1,
        config: ICE_SERVERS_CONFIG
      });

      const handleCall = (call) => {
        console.log(`[LiveStream] Incoming colleague connected to live feed! (peer: ${call.peer})`);
        call.answer(this.localStream);
        this.activeCalls.push(call);

        if (onViewerJoined) {
          onViewerJoined(this.activeCalls.length);
        }

        call.on('close', () => {
          this.activeCalls = this.activeCalls.filter(c => c !== call);
          if (onViewerJoined) onViewerJoined(this.activeCalls.length);
        });

        call.on('error', (err) => {
          console.warn('[LiveStream] Active call error:', err);
          this.activeCalls = this.activeCalls.filter(c => c !== call);
          if (onViewerJoined) onViewerJoined(this.activeCalls.length);
        });
      };

      this.peer.on('open', async (id) => {
        console.log(`[LiveStream] Broadcast online with Room ID: ${id}`);
        this.broadcastRoomId = id;

        // Register the feed with the backend
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

      // Answer incoming calls from colleagues/viewers and send our camera stream
      this.peer.on('call', handleCall);

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] PeerJS broadcaster error:', err);
        // If room ID already taken, create random extension with same ICE config
        if (err.type === 'unavailable-id') {
          console.info('[LiveStream] Room ID already in use, attaching randomized token.');
          const randomId = `${roomId}-${Math.floor(100 + Math.random() * 900)}`;
          this.peer = new Peer(randomId, {
            debug: 1,
            config: ICE_SERVERS_CONFIG
          });
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
              console.warn('[LiveStream] Feed registration (fallback ID) failed:', e);
              this._activeFeedId = null;
            }
            resolve({ roomId: newId, isHost: true, feedId: this._activeFeedId });
          });
          this.peer.on('call', handleCall);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Join and watch an arbitrary room ID directly
   */
  joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange = null) {
    return new Promise((resolve, reject) => {
      this.disconnectWatcher();

      const cleanRoomId = targetRoomId.trim();
      this.isWatching = true;

      // Create random viewer peer with full ICE config
      this.peer = new Peer({
        debug: 1,
        config: ICE_SERVERS_CONFIG
      });

      this.peer.on('open', (myId) => {
        console.log(`[LiveStream] Viewer peer active (${myId}), calling broadcaster room (${cleanRoomId})...`);

        try {
          // Generate active dummy stream with active canvas rendering + audio m-line
          this.dummyStream = createActiveDummyStream();

          const call = this.peer.call(cleanRoomId, this.dummyStream);

          if (!call) {
            throw new Error('Colleague stream offline or unreachable.');
          }

          let streamDispatched = false;
          const handleIncoming = (incomingStream) => {
            if (!incomingStream) return;
            console.log('[LiveStream] Received live colleague video stream!', incomingStream);
            this.remoteStream = incomingStream;
            if (!streamDispatched && onStreamReceived) {
              streamDispatched = true;
              onStreamReceived(incomingStream);
            }
            if (onConnectionChange) onConnectionChange('CONNECTED');
          };

          call.on('stream', handleIncoming);

          // Additional safety: listen to peerConnection ontrack if available
          if (call.peerConnection) {
            call.peerConnection.ontrack = (event) => {
              if (event.streams && event.streams[0]) {
                handleIncoming(event.streams[0]);
              }
            };

            call.peerConnection.onconnectionstatechange = () => {
              const state = call.peerConnection.connectionState;
              console.log(`[LiveStream] PeerConnection state: ${state}`);
              if (state === 'failed' || state === 'disconnected') {
                if (onConnectionChange) onConnectionChange('DISCONNECTED');
              }
            };
          }

          call.on('close', () => {
            console.log('[LiveStream] Broadcaster closed the stream.');
            if (onConnectionChange) onConnectionChange('DISCONNECTED');
          });

          call.on('error', (e) => {
            console.warn('[LiveStream] Call error:', e);
            if (onConnectionChange) onConnectionChange('ERROR');
          });

          resolve(call);
        } catch (e) {
          reject(e);
        }
      });

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] Viewer peer error:', err);
        if (onConnectionChange) onConnectionChange('ERROR');
        reject(err);
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
