// Multi-user WebRTC peer-to-peer video calling

type PeerInfo = {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  pendingCandidates: RTCIceCandidateInit[];
};

type SignalMessage = {
  type: "join" | "offer" | "answer" | "ice-candidate" | "leave";
  sender: string;
  target?: string; // Who this signal is for (undefined = broadcast)
  data?: any;
  timestamp: number;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com" },
  // Free TURN servers for better NAT traversal
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export class MultiUserVideoCall {
  private roomCode: string;
  private myUserId: string;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerInfo> = new Map();

  // Callbacks
  private onRemoteStreamAdded: (userId: string, stream: MediaStream) => void;
  private onRemoteStreamRemoved: (userId: string) => void;
  private onSignalToSend: (signal: SignalMessage) => void;
  private onConnectionStateChange?: (userId: string, state: string) => void;

  constructor(
    roomCode: string,
    myUserId: string,
    callbacks: {
      onRemoteStreamAdded: (userId: string, stream: MediaStream) => void;
      onRemoteStreamRemoved: (userId: string) => void;
      onSignalToSend: (signal: SignalMessage) => void;
      onConnectionStateChange?: (userId: string, state: string) => void;
    }
  ) {
    this.roomCode = roomCode;
    this.myUserId = myUserId;
    this.onRemoteStreamAdded = callbacks.onRemoteStreamAdded;
    this.onRemoteStreamRemoved = callbacks.onRemoteStreamRemoved;
    this.onSignalToSend = callbacks.onSignalToSend;
    this.onConnectionStateChange = callbacks.onConnectionStateChange;
  }

  // ========================
  // START LOCAL VIDEO
  // ========================
  async startLocalVideo(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    console.log("📹 Requesting getUserMedia...");

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: true,
      });

      const videoTracks = this.localStream.getVideoTracks();
      const audioTracks = this.localStream.getAudioTracks();
      console.log(
        `📹 Got stream: ${videoTracks.length} video, ${audioTracks.length} audio tracks`
      );

      if (videoTracks.length > 0) {
        console.log(
          `📹 Video track: ${videoTracks[0].label}, enabled: ${videoTracks[0].enabled}`
        );
      }

      return this.localStream;
    } catch (error) {
      console.error("❌ getUserMedia failed:", error);
      throw error;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ========================
  // ANNOUNCE JOIN (broadcast to room)
  // ========================
  announceJoin() {
    console.log(`📢 Announcing join for ${this.myUserId}`);
    this.onSignalToSend({
      type: "join",
      sender: this.myUserId,
      data: { joinId: Math.random().toString(36).substring(7) }, // Unique ID for each join
      timestamp: Date.now(),
    });
  }

  // ========================
  // ANNOUNCE LEAVE (broadcast to room)
  // ========================
  announceLeave() {
    console.log(`📢 Announcing leave for ${this.myUserId}`);
    this.onSignalToSend({
      type: "leave",
      sender: this.myUserId,
      timestamp: Date.now(),
    });
  }

  // ========================
  // CREATE PEER CONNECTION FOR A USER
  // ========================
  private createPeerConnection(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    // Add local tracks to this connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks from this peer
    pc.ontrack = (event) => {
      console.log(`[${remoteUserId}] Remote track received:`, event.track.kind);
      const [stream] = event.streams;

      const peerInfo = this.peers.get(remoteUserId);
      if (peerInfo) {
        peerInfo.stream = stream;
      }

      this.onRemoteStreamAdded(remoteUserId, stream);
    };

    // Handle ICE candidates - send to specific user
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignalToSend({
          type: "ice-candidate",
          sender: this.myUserId,
          target: remoteUserId, // IMPORTANT: targeted signal
          data: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    // ICE gathering state change
    pc.onicegatheringstatechange = () => {
      console.log(
        `[${remoteUserId}] ICE gathering state:`,
        pc.iceGatheringState
      );
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`[${remoteUserId}] Connection state:`, pc.connectionState);
      this.onConnectionStateChange?.(remoteUserId, pc.connectionState);

      if (pc.connectionState === "failed") {
        // Try to restart ICE on failure
        console.log(
          `[${remoteUserId}] Connection failed, attempting ICE restart...`
        );
        pc.restartIce();
      }

      if (pc.connectionState === "closed") {
        this.removePeer(remoteUserId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[${remoteUserId}] ICE state:`, pc.iceConnectionState);
    };

    // Store peer info with pending candidates queue
    this.peers.set(remoteUserId, {
      connection: pc,
      stream: null,
      pendingCandidates: [],
    });

    return pc;
  }

  // ========================
  // INITIATE CALL TO A USER (send offer)
  // ========================
  async callUser(remoteUserId: string) {
    console.log(`🔵 Calling user: ${remoteUserId}`);

    // Ensure local video is started
    if (!this.localStream) {
      await this.startLocalVideo();
    }

    const pc = this.createPeerConnection(remoteUserId);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      console.log(`🔵 Sending offer to ${remoteUserId}`);

      this.onSignalToSend({
        type: "offer",
        sender: this.myUserId,
        target: remoteUserId, // IMPORTANT: targeted signal
        data: offer,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`❌ Error creating offer for ${remoteUserId}:`, error);
    }
  }

  // ========================
  // HANDLE INCOMING SIGNAL
  // ========================
  async handleSignal(signal: SignalMessage) {
    // Ignore own signals
    if (signal.sender === this.myUserId) return;

    // If signal has a target and it's not me, ignore
    if (signal.target && signal.target !== this.myUserId) return;

    console.log(`Handling signal: ${signal.type} from ${signal.sender}`);

    switch (signal.type) {
      case "join":
        // New user joined - one side needs to initiate call
        // Use deterministic logic: higher userId calls lower userId to avoid both calling each other
        console.log(
          `🟡 JOIN signal from ${signal.sender}, joinId: ${
            signal.data?.joinId
          }, localStream: ${!!this.localStream}`
        );
        if (this.localStream) {
          const existingPeer = this.peers.get(signal.sender);
          // Check if we need to reconnect - either no peer, failed/closed connection, or disconnected
          const needsReconnect =
            !existingPeer ||
            existingPeer.connection.connectionState === "failed" ||
            existingPeer.connection.connectionState === "closed" ||
            existingPeer.connection.connectionState === "disconnected" ||
            existingPeer.connection.iceConnectionState === "disconnected" ||
            existingPeer.connection.iceConnectionState === "failed";

          // Only the user with higher ID initiates the call to avoid glare
          const shouldInitiate = this.myUserId > signal.sender;
          console.log(
            `🟡 shouldInitiate: ${shouldInitiate} (me: ${this.myUserId}, them: ${signal.sender})`
          );

          if (needsReconnect && shouldInitiate) {
            // Remove old peer if exists
            if (existingPeer) {
              console.log(`🟡 Removing stale connection to ${signal.sender}`);
              this.removePeer(signal.sender);
            }
            console.log(`🟡 Initiating call to ${signal.sender}`);
            await this.callUser(signal.sender);
          } else if (!needsReconnect) {
            console.log(
              `🟡 Already have active connection to ${signal.sender}: ${existingPeer?.connection.connectionState}`
            );
          } else {
            console.log(
              `🟡 Waiting for ${signal.sender} to call me (they have higher ID)`
            );
          }
        }
        break;

      case "offer":
        await this.handleOffer(signal.sender, signal.data);
        break;

      case "answer":
        await this.handleAnswer(signal.sender, signal.data);
        break;

      case "ice-candidate":
        await this.handleIceCandidate(signal.sender, signal.data);
        break;

      case "leave":
        this.removePeer(signal.sender);
        break;
    }
  }

  // ========================
  // HANDLE OFFER (create answer)
  // ========================
  private async handleOffer(
    fromUserId: string,
    offer: RTCSessionDescriptionInit
  ) {
    console.log(`🟢 Received offer from: ${fromUserId}`);

    // Ensure local video is started
    if (!this.localStream) {
      await this.startLocalVideo();
    }

    // Get or create peer connection
    let peerInfo = this.peers.get(fromUserId);
    let pc: RTCPeerConnection;

    if (peerInfo) {
      // Check if existing connection is stale
      const state = peerInfo.connection.signalingState;
      const connState = peerInfo.connection.connectionState;
      console.log(
        `🟢 Existing peer ${fromUserId}: signaling=${state}, connection=${connState}`
      );

      // If we already have a stable connection but receive new offer, the other user might have refreshed
      // In this case, we should create a new connection
      if (
        connState === "disconnected" ||
        connState === "failed" ||
        connState === "closed" ||
        state === "stable" ||
        state === "have-local-offer"
      ) {
        console.log(
          `🟢 Removing stale connection for ${fromUserId}, creating new one`
        );
        this.removePeer(fromUserId);
        pc = this.createPeerConnection(fromUserId);
        peerInfo = this.peers.get(fromUserId)!;
      } else {
        pc = peerInfo.connection;
      }
    } else {
      pc = this.createPeerConnection(fromUserId);
      peerInfo = this.peers.get(fromUserId)!;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Process any pending ICE candidates after setting remote description
      if (peerInfo && peerInfo.pendingCandidates.length > 0) {
        console.log(
          `🟢 Processing ${peerInfo.pendingCandidates.length} pending ICE candidates after offer`
        );
        for (const candidate of peerInfo.pendingCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error(`Error adding pending ICE candidate:`, e);
          }
        }
        peerInfo.pendingCandidates = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log(`🟢 Sending answer to ${fromUserId}`);

      this.onSignalToSend({
        type: "answer",
        sender: this.myUserId,
        target: fromUserId, // IMPORTANT: targeted signal
        data: answer,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`❌ Error handling offer from ${fromUserId}:`, error);
      // If error occurred, try to recreate connection
      this.removePeer(fromUserId);
    }
  }

  // ========================
  // HANDLE ANSWER
  // ========================
  private async handleAnswer(
    fromUserId: string,
    answer: RTCSessionDescriptionInit
  ) {
    const peerInfo = this.peers.get(fromUserId);
    if (!peerInfo) {
      console.warn(`No peer connection for ${fromUserId} to handle answer`);
      return;
    }

    const pc = peerInfo.connection;
    console.log(
      `🟢 Handling answer from ${fromUserId}, signalingState: ${pc.signalingState}`
    );

    try {
      if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`🟢 Answer accepted from ${fromUserId}`);

        // Process any pending ICE candidates
        const peerInfo = this.peers.get(fromUserId);
        if (peerInfo && peerInfo.pendingCandidates.length > 0) {
          console.log(
            `🟢 Processing ${peerInfo.pendingCandidates.length} pending ICE candidates`
          );
          for (const candidate of peerInfo.pendingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error(`Error adding pending ICE candidate:`, e);
            }
          }
          peerInfo.pendingCandidates = [];
        }
      } else {
        console.log(`🟢 Ignoring answer - wrong state: ${pc.signalingState}`);
      }
    } catch (error) {
      console.error(
        `❌ Error setting remote description from ${fromUserId}:`,
        error
      );
    }
  }

  // ========================
  // HANDLE ICE CANDIDATE
  // ========================
  private async handleIceCandidate(
    fromUserId: string,
    candidate: RTCIceCandidateInit
  ) {
    const peerInfo = this.peers.get(fromUserId);
    if (!peerInfo) {
      console.warn(`No peer connection for ${fromUserId} to add ICE candidate`);
      return;
    }

    try {
      // If remote description is set, add candidate immediately
      if (peerInfo.connection.remoteDescription) {
        await peerInfo.connection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } else {
        // Queue candidate to add later when remote description is set
        console.log(
          `Queuing ICE candidate for ${fromUserId} (no remote description yet)`
        );
        peerInfo.pendingCandidates.push(candidate);
      }
    } catch (error) {
      console.error(`Error adding ICE candidate from ${fromUserId}:`, error);
    }
  }

  // ========================
  // REMOVE PEER
  // ========================
  private removePeer(userId: string) {
    const peerInfo = this.peers.get(userId);
    if (peerInfo) {
      peerInfo.connection.close();
      this.peers.delete(userId);
      this.onRemoteStreamRemoved(userId);
    }
  }

  // ========================
  // MEDIA CONTROLS
  // ========================
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  // ========================
  // GET ALL PEER USER IDs
  // ========================
  getPeerUserIds(): string[] {
    return Array.from(this.peers.keys());
  }

  // ========================
  // DISCONNECT ALL
  // ========================
  disconnect() {
    this.announceLeave();

    // Close all peer connections
    this.peers.forEach((peerInfo, userId) => {
      peerInfo.connection.close();
    });
    this.peers.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}

// ========================
// SIGNALING HELPERS (with target support)
// ========================
export async function sendSignalMulti(roomCode: string, signal: SignalMessage) {
  console.log(
    `📤 Sending signal: ${signal.type} from ${signal.sender} to ${
      signal.target || "broadcast"
    }`
  );
  try {
    const res = await fetch("/api/webrtc/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode,
        ...signal,
      }),
    });
    const data = await res.json();
    console.log(`📤 Signal sent:`, data);
  } catch (err) {
    console.error(`📤 Signal failed:`, err);
  }
}

export async function getSignalsMulti(
  roomCode: string,
  since: number = 0
): Promise<SignalMessage[]> {
  const res = await fetch(
    `/api/webrtc/signal?roomCode=${roomCode}&since=${since}`
  );
  const data = await res.json();
  return data.signals || [];
}
