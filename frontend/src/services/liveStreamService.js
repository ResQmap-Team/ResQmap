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

class LiveStreamManager {
  constructor() {
    this.peer            = null;
    this.localStream     = null;
    this.activeCalls     = [];
    this.remoteStream    = null;
    this.isBroadcasting  = false;
    this.isWatching      = false;
    this.broadcastRoomId = null;

    // Backend feed record tracking
    this._activeFeedId   = null;   // DB id returned by POST /api/feeds
  }

  // Sanitize room ID for WebRTC peer names
  getPeerRoomId(incidentId) {
    const clean = incidentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `resqnet-${clean}`;
  }

  /** Expose the current active feed ID (for UI display / debugging). */
  getActiveFeedId() {
    return this._activeFeedId;
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

      // Connect to free public PeerJS WebRTC signaling broker
      this.peer = new Peer(roomId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', async (id) => {
        console.log(`[LiveStream] Broadcast online with Room ID: ${id}`);

        // ── Register the feed with the backend ─────────────────────────────
        // This is the authoritative moment: PeerJS is live, stream is real.
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

          // Tell the backend the feed is now LIVE (status transitions from STARTING → LIVE)
          if (this._activeFeedId) {
            await apiClient.updateFeed(this._activeFeedId, { status: 'LIVE' }).catch(() => {});
          }
          console.info(`[LiveStream] Feed registered → feedId=${this._activeFeedId}`);
        } catch (err) {
          // Feed registration failure is non-fatal — WebRTC still works
          console.warn('[LiveStream] Feed registration failed (non-fatal):', err);
          this._activeFeedId = null;
        }

        resolve({ roomId: id, isHost: true, feedId: this._activeFeedId });
      });

      // Answer incoming calls from colleagues/viewers and send our camera stream
      this.peer.on('call', (call) => {
        console.log(`[LiveStream] Incoming colleague connected to live feed!`);
        call.answer(this.localStream);
        this.activeCalls.push(call);

        if (onViewerJoined) {
          onViewerJoined(this.activeCalls.length);
        }

        call.on('close', () => {
          this.activeCalls = this.activeCalls.filter(c => c !== call);
          if (onViewerJoined) onViewerJoined(this.activeCalls.length);
        });
      });

      this.peer.on('error', (err) => {
        console.warn('[LiveStream] PeerJS broadcaster error:', err);
        // If room ID already taken, create random extension
        if (err.type === 'unavailable-id') {
          console.info('[LiveStream] Room ID already in use, attaching randomized token.');
          const randomId = `${roomId}-${Math.floor(100 + Math.random() * 900)}`;
          this.peer = new Peer(randomId);
          this.peer.on('open', async (newId) => {
            // Register feed with the new (fallback) room ID
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
          this.peer.on('call', (call) => {
            call.answer(this.localStream);
            this.activeCalls.push(call);
            if (onViewerJoined) onViewerJoined(this.activeCalls.length);
          });
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Join and watch a colleague's live broadcast
   */
  joinBroadcast(incidentId, onStreamReceived, onConnectionChange = null) {
    return new Promise((resolve, reject) => {
      this.disconnectWatcher();

      const targetRoomId = this.getPeerRoomId(incidentId);
      this.isWatching = true;

      // Create random viewer peer
      this.peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (myId) => {
        console.log(`[LiveStream] Viewer peer active (${myId}), connecting to colleague broadcaster (${targetRoomId})...`);

        // Create empty media stream or silent audio track to initiate call
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 2;
          canvas.height = 2;
          const dummyStream = canvas.captureStream(5);

          const call = this.peer.call(targetRoomId, dummyStream);

          if (!call) {
            throw new Error('Colleague stream offline or unreachable.');
          }

          call.on('stream', (incomingStream) => {
            console.log('[LiveStream] Received live colleague video stream!', incomingStream);
            this.remoteStream = incomingStream;
            if (onStreamReceived) onStreamReceived(incomingStream);
            if (onConnectionChange) onConnectionChange('CONNECTED');
          });

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
   * Stop the broadcast and mark the backend feed record as ENDED.
   */
  stopBroadcast() {
    this.isBroadcasting = false;
    this.activeCalls.forEach(call => {
      try { call.close(); } catch (e) {}
    });
    this.activeCalls = [];
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }

    // ── Deregister the feed with the backend ───────────────────────────────
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
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
  }
}

export const liveStreamService = new LiveStreamManager();
