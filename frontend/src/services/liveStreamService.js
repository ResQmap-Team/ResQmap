import { apiClient } from './api';

/**
 * ResQMap Multi-Redundant Real-Time Video Broadcast Engine
 * Guaranteed live video streaming across mobile 5G, Opera VPN, CGNAT, and Wi-Fi.
 */

const STUN_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
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

    // Snapshot extraction video attached to DOM
    this.snapCanvas      = document.createElement('canvas');
    this.snapVideo       = null;

    this.frameInterval   = null;
    this.peerConnections = new Map();
    this.viewerPC        = null;
    this.myViewerId      = null;
    this._unsubBackend   = [];
  }

  normalizeId(str) {
    if (!str) return '';
    return String(str).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
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
    return new Promise((resolve) => {
      this.stopBroadcast();

      const roomId = this.getPeerRoomId(incidentId);
      this.broadcastRoomId = roomId;
      this.localStream     = stream;
      this.isBroadcasting  = true;

      // ── DOM-Attached Video for Guaranteed Frame Decoding ────────────
      this.snapVideo = document.createElement('video');
      this.snapVideo.muted = true;
      this.snapVideo.autoplay = true;
      this.snapVideo.playsInline = true;
      this.snapVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:320px;height:240px;opacity:0.01;pointer-events:none;z-index:-1;';
      document.body.appendChild(this.snapVideo);
      this.snapVideo.srcObject = stream;
      this.snapVideo.play().catch(() => {});

      const track = stream.getVideoTracks()[0];
      let imageCap = null;
      try {
        if (window.ImageCapture && track) {
          imageCap = new ImageCapture(track);
        }
      } catch (e) {}

      // ── Pipeline 1: Live Frame Pump via WebSocket (15 FPS) ──────────
      this.frameInterval = setInterval(async () => {
        if (!this.isBroadcasting) return;
        try {
          let sent = false;

          // Strategy A: ImageCapture API
          if (imageCap && track && track.readyState === 'live') {
            try {
              const bitmap = await imageCap.grabFrame();
              if (bitmap && bitmap.width > 0) {
                const w = 440;
                const h = Math.round((bitmap.height / bitmap.width) * 440) || 250;
                this.snapCanvas.width = w;
                this.snapCanvas.height = h;
                const ctx = this.snapCanvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, w, h);
                const frameJpeg = this.snapCanvas.toDataURL('image/jpeg', 0.52);
                apiClient.sendWS({
                  type: 'LIVE_FEED_FRAME',
                  roomId,
                  normRoom: this.normalizeId(roomId),
                  frame: frameJpeg,
                  t: Date.now()
                });
                sent = true;
              }
            } catch (e) {}
          }

          // Strategy B: DOM Video Element
          if (!sent && this.snapVideo && this.snapVideo.videoWidth > 0) {
            const w = 440;
            const h = Math.round((this.snapVideo.videoHeight / this.snapVideo.videoWidth) * 440) || 250;
            this.snapCanvas.width = w;
            this.snapCanvas.height = h;
            const ctx = this.snapCanvas.getContext('2d');
            ctx.drawImage(this.snapVideo, 0, 0, w, h);
            const frameJpeg = this.snapCanvas.toDataURL('image/jpeg', 0.52);
            apiClient.sendWS({
              type: 'LIVE_FEED_FRAME',
              roomId,
              normRoom: this.normalizeId(roomId),
              frame: frameJpeg,
              t: Date.now()
            });
          }
        } catch (err) {}
      }, 70);

      // ── Pipeline 2: WebRTC Signaling via WebSocket ──────────────────
      const unsubStreamReq = apiClient.on('STREAM_REQUEST', async (msg) => {
        const msgNorm = this.normalizeId(msg.roomId);
        const hostNorm = this.normalizeId(roomId);
        if ((msgNorm === hostNorm || msgNorm.includes(hostNorm) || hostNorm.includes(msgNorm)) && msg.viewerId) {
          console.log(`[Broadcaster] Viewer ${msg.viewerId} requested WebRTC stream, initiating offer...`);
          await this._sendWebRTCOffer(roomId, msg.viewerId, onViewerJoined);
        }
      });
      this._unsubBackend.push(unsubStreamReq);

      const unsubAnswer = apiClient.on('WEBRTC_ANSWER', async (msg) => {
        if (msg.viewerId && this.peerConnections.has(msg.viewerId)) {
          const pc = this.peerConnections.get(msg.viewerId);
          if (pc && msg.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(() => {});
            console.log(`[Broadcaster] Applied WebRTC Answer from ${msg.viewerId}`);
          }
        }
      });
      this._unsubBackend.push(unsubAnswer);

      const unsubCandidate = apiClient.on('WEBRTC_ICE_CANDIDATE', async (msg) => {
        if (msg.viewerId && this.peerConnections.has(msg.viewerId)) {
          const pc = this.peerConnections.get(msg.viewerId);
          if (pc && msg.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
          }
        }
      });
      this._unsubBackend.push(unsubCandidate);

      // Register feed with backend
      try {
        const feedPayload = {
          peer_room_id: roomId,
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

      resolve({ roomId, isHost: true, feedId: this._activeFeedId });
    });
  }

  async _sendWebRTCOffer(roomId, viewerId, onViewerJoined) {
    try {
      if (this.peerConnections.has(viewerId)) {
        try { this.peerConnections.get(viewerId).close(); } catch (e) {}
      }

      const pc = new RTCPeerConnection(STUN_CONFIG);
      this.peerConnections.set(viewerId, pc);

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          apiClient.sendWS({
            type: 'WEBRTC_ICE_CANDIDATE',
            roomId,
            targetViewerId: viewerId,
            candidate: event.candidate
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (onViewerJoined) onViewerJoined(this.peerConnections.size);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.peerConnections.delete(viewerId);
          if (onViewerJoined) onViewerJoined(this.peerConnections.size);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      apiClient.sendWS({
        type: 'WEBRTC_OFFER',
        roomId,
        targetViewerId: viewerId,
        sdp: offer
      });

      if (onViewerJoined) onViewerJoined(this.peerConnections.size);
    } catch (e) {
      console.warn('[Broadcaster] WebRTC offer creation error:', e);
    }
  }

  /**
   * Join and watch an arbitrary room ID directly
   */
  joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange = null, onFrameReceived = null) {
    return new Promise((resolve) => {
      this.disconnectWatcher();

      const cleanRoomId = targetRoomId.trim();
      const normTarget = this.normalizeId(cleanRoomId);
      this.isWatching = true;
      this.targetRoomId = cleanRoomId;
      this.myViewerId = `viewer_${Math.floor(100000 + Math.random() * 900000)}`;

      console.log(`[Viewer] Watching room: ${cleanRoomId} (${normTarget}) as ${this.myViewerId}`);

      // ── Pipeline 1: Listen for Live Frames via Backend WebSocket ───
      const unsubFrame = apiClient.on('LIVE_FEED_FRAME', (msg) => {
        if (!msg || !msg.frame) return;
        const msgNorm = this.normalizeId(msg.roomId || msg.normRoom);
        if (msgNorm === normTarget || msgNorm.includes(normTarget) || normTarget.includes(msgNorm) || normTarget === '') {
          if (onFrameReceived) onFrameReceived(msg.frame);
          if (onConnectionChange) onConnectionChange('CONNECTED');
        }
      });
      this._unsubBackend.push(unsubFrame);

      // ── Pipeline 2: WebRTC Offer / Answer Listener ─────────────────
      const unsubOffer = apiClient.on('WEBRTC_OFFER', async (msg) => {
        if (msg.targetViewerId === this.myViewerId && msg.sdp) {
          console.log('[Viewer] Received WebRTC Offer from broadcaster! Answering...');
          await this._answerWebRTCOffer(cleanRoomId, msg.sdp, onStreamReceived, onConnectionChange);
        }
      });
      this._unsubBackend.push(unsubOffer);

      const unsubCandidate = apiClient.on('WEBRTC_ICE_CANDIDATE', async (msg) => {
        if (msg.targetViewerId === this.myViewerId && msg.candidate) {
          if (this.viewerPC) {
            await this.viewerPC.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
          }
        }
      });
      this._unsubBackend.push(unsubCandidate);

      // Request WebRTC stream from broadcaster
      const requestStream = () => {
        if (!this.isWatching) return;
        apiClient.sendWS({
          type: 'STREAM_REQUEST',
          roomId: cleanRoomId,
          viewerId: this.myViewerId
        });
      };

      requestStream();
      this.reqInterval = setInterval(requestStream, 2500);

      if (onConnectionChange) onConnectionChange('CONNECTED');
      resolve(true);
    });
  }

  async _answerWebRTCOffer(roomId, offerSdp, onStreamReceived, onConnectionChange) {
    try {
      if (this.viewerPC) {
        try { this.viewerPC.close(); } catch (e) {}
      }

      this.viewerPC = new RTCPeerConnection(STUN_CONFIG);

      this.viewerPC.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          console.log('[Viewer] Native WebRTC HD stream connected!', event.streams[0]);
          this.remoteStream = event.streams[0];
          if (onStreamReceived) onStreamReceived(event.streams[0]);
          if (onConnectionChange) onConnectionChange('CONNECTED');
        }
      };

      this.viewerPC.onicecandidate = (event) => {
        if (event.candidate) {
          apiClient.sendWS({
            type: 'WEBRTC_ICE_CANDIDATE',
            roomId,
            viewerId: this.myViewerId,
            candidate: event.candidate
          });
        }
      };

      await this.viewerPC.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await this.viewerPC.createAnswer();
      await this.viewerPC.setLocalDescription(answer);

      apiClient.sendWS({
        type: 'WEBRTC_ANSWER',
        roomId,
        viewerId: this.myViewerId,
        sdp: answer
      });
    } catch (e) {
      console.warn('[Viewer] Error handling WebRTC offer:', e);
    }
  }

  joinBroadcast(incidentId, onStreamReceived, onConnectionChange = null, onFrameReceived = null) {
    const targetRoomId = this.getPeerRoomId(incidentId);
    return this.joinBroadcastByRoomId(targetRoomId, onStreamReceived, onConnectionChange, onFrameReceived);
  }

  stopBroadcast() {
    this.isBroadcasting = false;
    this.broadcastRoomId = null;

    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    if (this.snapVideo && this.snapVideo.parentNode) {
      this.snapVideo.parentNode.removeChild(this.snapVideo);
      this.snapVideo = null;
    }

    this._unsubBackend.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._unsubBackend = [];

    this.peerConnections.forEach(pc => {
      try { pc.close(); } catch (e) {}
    });
    this.peerConnections.clear();

    if (this._activeFeedId) {
      const feedId = this._activeFeedId;
      this._activeFeedId = null;
      apiClient.updateFeed(feedId, { status: 'ENDED' }).catch(() => {});
    }
  }

  disconnectWatcher() {
    this.isWatching   = false;
    this.remoteStream = null;

    if (this.reqInterval) {
      clearInterval(this.reqInterval);
      this.reqInterval = null;
    }

    this._unsubBackend.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._unsubBackend = [];

    if (this.viewerPC) {
      try { this.viewerPC.close(); } catch (e) {}
      this.viewerPC = null;
    }
  }
}

export const liveStreamService = new LiveStreamManager();
