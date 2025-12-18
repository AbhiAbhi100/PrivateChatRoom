// WebRTC peer-to-peer video calling helpers

export class VideoCall {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private roomCode: string;
  private username: string;
  private onRemoteStream: (stream: MediaStream) => void;
  private onIceCandidate: (candidate: RTCIceCandidate) => void;
  private onConnectionStateChange?: (state: string) => void;
  private isNegotiating: boolean = false;

  constructor(
    roomCode: string,
    username: string,
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onConnectionStateChange?: (state: string) => void
  ) {
    this.roomCode = roomCode;
    this.username = username;
    this.onRemoteStream = onRemoteStream;
    this.onIceCandidate = onIceCandidate;
    this.onConnectionStateChange = onConnectionStateChange;

    // Create peer connection with STUN servers
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    this.setupPeerConnection();
  }

  private setupPeerConnection() {
    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind);
      const [remoteStream] = event.streams;
      this.remoteStream = remoteStream;
      this.onRemoteStream(remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate:", event.candidate.candidate);
        this.onIceCandidate(event.candidate);
      }
    };

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state:",
        this.peerConnection.iceConnectionState
      );
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.iceConnectionState);
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log("Signaling state:", this.peerConnection.signalingState);
      this.isNegotiating = this.peerConnection.signalingState !== "stable";
    };
  }

  async startLocalVideo(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        console.log("Adding track:", track.kind);
        this.peerConnection.addTrack(track, this.localStream!);
      });

      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    // Start local video first if not already started
    if (!this.localStream) {
      await this.startLocalVideo();
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection.signalingState === "have-local-offer") {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.peerConnection.close();
  }
}

// Signaling helpers
export async function sendSignal(
  roomCode: string,
  type: string,
  data: any,
  sender: string
) {
  await fetch("/api/webrtc/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomCode,
      type,
      data,
      sender,
    }),
  });
}

export async function getSignals(roomCode: string, since: number = 0) {
  const res = await fetch(
    `/api/webrtc/signal?roomCode=${roomCode}&since=${since}`
  );
  const data = await res.json();
  return data.signals || [];
}
