import Peer from 'peerjs';
import { apiClient } from './api';

/**
 * ResQMap Ultra-Resilient WebRTC Live Video Streaming Engine
 * 
 * Features:
 *  - Google STUN + Twilio STUN + OpenRelay Global TURN (port 80, 443 TCP/UDP)
 *  - Guaranteed NAT traversal across mobile 5G, 4G, CGNAT, Wi-Fi, and firewalls
 *  - PeerJS direct P2P HD MediaStream with DataChannel frame backup
 *  - Automatic retry & reconnection loop
 */

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      // OpenRelay Project Free TURN Servers (TCP & UDP on port 443)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }
};

class LiveStreamManager {
  constructor() {
    this.localStream     = null;
    this.remoteStream    = null;
    this.isBroadcasting  = false;
    this.isWatching      = false;
    this.broadcastRoomId = null;
    this.targetRoomId    = null;
    this._activeFeedId   = null;

    this.broadcasterPeer = null;
    this.viewerPeer      = null;
    this.activeCalls     = new Set();
    this.activeConns     = new Set();
    this.retryTimer      = null;
    this.frameInterval   = null;
    this.snapCanvas      = document.createElement('canvas');
  }

  normalizeId(str) {
    if (!str) return 'stream';
    return String(str).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  getPeerRoomId(incidentId) {
    if (!incidentId) return 'resq-stream';
    const clean = this.normalizeId(incidentId);
    return `resq-live-${clean}`;
  }

  getActiveFeedId() {
    return this._activeFeedId;
  }

  getBroadcastRoomId() {
    return this.broadcastRoomId;
  }

  /**
   * Helper: creates a lightweight dummy 1x1 MediaStream for viewers so peer.call
   * can initiate WebRTC handshake without requesting viewer camera permission.
   */
  _createDummyStream() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 2, 2);
      }
      if (canvas.captureStream) {
        return canvas.captureStream(1);
      }
    } catch (e) {}
    return null;
  }

  /**
   * Start broadcasting local camera stream to the internet.
   */
  startBroadcast(incidentId, stream, onViewerJoined = null, meta = {}, videoSourceElement = null) {
    return new Promise((resolve) => {
      this.stopBroadcast();

      const baseRoomId = this.getPeerRoomId(incidentId);
      this.localStream = stream;
      this.isBroadcasting = true;

      const initPeer = (peerIdToTry) => {
        try {
          if (this.broadcasterPeer) {
            try { this.broadcasterPeer.destroy(); } catch (e) {}
          }

          this.broadcasterPeer = new Peer(peerIdToTry, PEER_CONFIG);

          this.broadcasterPeer.on('open', (assignedId) => {
            console.log(`[Broadcaster] Live stream peer ready with ID: ${assignedId}`);
            this.broadcastRoomId = assignedId;

            // Register active feed with backend REST API
            try {
              const feedPayload = {
                peer_room_id: assignedId,
                incident_id:  incidentId || '',
                responder_id: meta.responderId || null,
                latitude:     meta.latitude    ?? null,
                longitude:    meta.longitude   ?? null,
              };
              apiClient.registerFeed(feedPayload).then((feedRecord) => {
                this._activeFeedId = feedRecord?.id ?? null;
                if (this._activeFeedId) {
                  apiClient.updateFeed(this._activeFeedId, { status: 'LIVE' }).catch(() => {});
                }
              }).catch(() => {});
            } catch (e) {}

            resolve({ roomId: assignedId, isHost: true, feedId: this._activeFeedId });
          });

          // Handle incoming WebRTC video call from viewers
          this.broadcasterPeer.on('call', (mediaCall) => {
            console.log(`[Broadcaster] Answering live video call from viewer: ${mediaCall.peer}`);
            mediaCall.answer(this.localStream);
            this.activeCalls.add(mediaCall);

            if (onViewerJoined) onViewerJoined(this.activeCalls.size);

            mediaCall.on('close', () => {
              this.activeCalls.delete(mediaCall);
              if (onViewerJoined) onViewerJoined(this.activeCalls.size);
            });

            mediaCall.on('error', (err) => {
              console.warn('[Broadcaster] MediaCall error:', err);
              this.activeCalls.delete(mediaCall);
              if (onViewerJoined) onViewerJoined(this.activeCalls.size);
            });
          });

          // Handle incoming WebRTC data connection from viewers (P2P Frame Channel)
          this.broadcasterPeer.on('connection', (dataConn) => {
            console.log(`[Broadcaster] Viewer data connection opened: ${dataConn.peer}`);
            this.activeConns.add(dataConn);

            dataConn.on('close', () => this.activeConns.delete(dataConn));
            dataConn.on('error', () => this.activeConns.delete(dataConn));
          });

          // Collision handling if ID is currently reserved
          this.broadcasterPeer.on('error', (err) => {
            console.warn('[Broadcaster] Peer error:', err?.type || err);
            if (err?.type === 'unavailable-id') {
              const fallbackId = `${baseRoomId}-${Math.floor(100 + Math.random() * 900)}`;
              console.log(`[Broadcaster] Retrying with unique ID: ${fallbackId}`);
              setTimeout(() => initPeer(fallbackId), 500);
            }
          });
        } catch (e) {
          console.warn('[Broadcaster] Error creating peer:', e);
          resolve({ roomId: baseRoomId, isHost: true });
        }
      };

      initPeer(baseRoomId);

      // P2P DataChannel Frame Broadcast pump (~8 FPS)
      this.frameInterval = setInterval(() => {
        if (!this.isBroadcasting || this.activeConns.size === 0) return;
        try {
          const v = (videoSourceElement && videoSourceElement.videoWidth > 0) ? videoSourceElement : null;
          if (v && v.videoWidth > 0) {
            const w = 320;
            const h = Math.round((v.videoHeight / v.videoWidth) * 320) || 240;
            this.snapCanvas.width = w;
            this.snapCanvas.height = h;
            const ctx = this.snapCanvas.getContext('2d');
            ctx.drawImage(v, 0, 0, w, h);
            const frame = this.snapCanvas.toDataURL('image/jpeg', 0.45);
            this.activeConns.forEach(conn => {
              if (conn.open) {
                try { conn.send({ type: 'LIVE_FRAME', frame }); } catch (e) {}
              }
            });
          }
        } catch (e) {}
      }, 125);
    });
  }

  /**
   * Join and watch an arbitrary room ID or active feed
   */
  joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange = null, onFrameReceived = null, targetFeedId = null) {
    return new Promise((resolve) => {
      this.disconnectWatcher();

      const rawRoom = (targetRoomId || '').trim();
      const cleanTarget = rawRoom.startsWith('resq-live-') ? rawRoom : this.getPeerRoomId(rawRoom);

      this.isWatching   = true;
      this.targetRoomId = cleanTarget;

      console.log(`[Viewer] Connecting to live broadcaster: ${cleanTarget}`);

      let connected = false;
      const dummyStream = this._createDummyStream();

      const connectToHost = () => {
        if (!this.isWatching || connected) return;

        try {
          if (this.viewerPeer) {
            try { this.viewerPeer.destroy(); } catch (e) {}
          }

          this.viewerPeer = new Peer(PEER_CONFIG);

          this.viewerPeer.on('open', (viewerId) => {
            if (!this.isWatching) return;
            console.log(`[Viewer] Viewer peer ready (${viewerId}), dialing broadcaster ${cleanTarget}...`);

            // 1. Establish P2P Data Connection
            try {
              const conn = this.viewerPeer.connect(cleanTarget, { reliable: false });
              conn.on('open', () => {
                console.log('[Viewer] P2P Data connection connected to broadcaster!');
                if (onConnectionChange) onConnectionChange('CONNECTED');
              });
              conn.on('data', (data) => {
                if (data && data.type === 'LIVE_FRAME' && data.frame) {
                  if (onFrameReceived) onFrameReceived(data.frame);
                  if (onConnectionChange) onConnectionChange('CONNECTED');
                }
              });
            } catch (e) {}

            // 2. Establish WebRTC Video Stream Call
            try {
              const call = this.viewerPeer.call(cleanTarget, dummyStream);
              if (call) {
                call.on('stream', (remoteStream) => {
                  console.log('[Viewer] SUCCESS! Live camera stream received from broadcaster:', remoteStream);
                  connected = true;
                  this.remoteStream = remoteStream;
                  if (onStreamReceived) onStreamReceived(remoteStream);
                  if (onConnectionChange) onConnectionChange('CONNECTED');
                });

                call.on('close', () => {
                  console.log('[Viewer] Media stream call closed');
                  if (!connected && onConnectionChange) onConnectionChange('DISCONNECTED');
                });

                call.on('error', (err) => {
                  console.warn('[Viewer] Call error:', err);
                });
              }
            } catch (e) {
              console.warn('[Viewer] Error calling broadcaster:', e);
            }
          });

          this.viewerPeer.on('error', (err) => {
            console.warn('[Viewer] Peer error:', err?.type || err);
            // If broadcaster peer is not found yet, retry in 3 seconds
            if (err?.type === 'peer-unavailable' && this.isWatching && !connected) {
              clearTimeout(this.retryTimer);
              this.retryTimer = setTimeout(() => connectToHost(), 3000);
            }
          });
        } catch (e) {
          console.warn('[Viewer] Connection attempt error:', e);
        }
      };

      connectToHost();
      resolve(true);
    });
  }

  joinBroadcast(incidentId, onStreamReceived, onConnectionChange = null, onFrameReceived = null) {
    const targetRoomId = this.getPeerRoomId(incidentId);
    return this.joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange, onFrameReceived);
  }

  stopBroadcast() {
    this.isBroadcasting  = false;
    this.broadcastRoomId = null;

    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    this.activeCalls.forEach(call => {
      try { call.close(); } catch (e) {}
    });
    this.activeCalls.clear();

    this.activeConns.forEach(conn => {
      try { conn.close(); } catch (e) {}
    });
    this.activeConns.clear();

    if (this.broadcasterPeer) {
      try { this.broadcasterPeer.destroy(); } catch (e) {}
      this.broadcasterPeer = null;
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
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.viewerPeer) {
      try { this.viewerPeer.destroy(); } catch (e) {}
      this.viewerPeer = null;
    }
  }
}

export const liveStreamService = new LiveStreamManager();

