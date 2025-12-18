"use client";
import { encryptText, decryptText } from "@/lib/crypto";
import {
  MultiUserVideoCall,
  sendSignalMulti,
  getSignalsMulti,
} from "@/lib/webrtc-multi";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

type Message = {
  id: string;
  sender: string;
  text: string;
};

// SVG Icons
const VideoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const MicIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const MicOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <line x1="22" x2="2" y1="2" y2="22" />
  </svg>
);

// Video tile component for each participant
function VideoTile({
  stream,
  label,
  isMuted = false,
  isMirrored = false,
}: {
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
  isMirrored?: boolean;
}) {
  const videoRef = useCallback(
    (video: HTMLVideoElement | null) => {
      if (video && stream) {
        video.srcObject = stream;
        video.muted = isMuted;

        // For remote streams (not muted), we need user interaction for audio
        // But video should autoplay
        video.play().catch((err) => {
          console.log(`Play failed for ${label}:`, err);
          // Only mute if this is supposed to be unmuted (remote stream)
          // This allows video to play, user can click to unmute
          if (!isMuted) {
            console.log(
              `${label}: Playing muted first, will unmute on interaction`
            );
            video.muted = true;
            video
              .play()
              .then(() => {
                // Try to unmute after a short delay (user has interacted with page)
                setTimeout(() => {
                  video.muted = false;
                }, 100);
              })
              .catch((e) => console.error("Still failed:", e));
          }
        });
      }
    },
    [stream, isMuted, label]
  );

  return (
    <div className="relative bg-zinc-800/50 rounded-xl overflow-hidden aspect-video border border-zinc-700/50">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full object-cover ${
            isMirrored ? "scale-x-[-1]" : ""
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xl md:text-2xl text-zinc-400 font-medium">
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] md:text-xs font-medium z-10">
        {label}
      </div>
    </div>
  );
}

export default function RoomPage() {
  const { roomCode } = useParams();

  // States
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [ttl, setTtl] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [roomExists, setRoomExists] = useState(true);

  // Video states - MULTI USER
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );
  const [connectionStates, setConnectionStates] = useState<Map<string, string>>(
    new Map()
  );
  const [incomingCall, setIncomingCall] = useState<{ from: string } | null>(
    null
  );
  const [activeCallers, setActiveCallers] = useState<Set<string>>(new Set());

  const videoCallRef = useRef<MultiUserVideoCall | null>(null);
  const processedSignals = useRef<Set<string>>(new Set());
  const lastSignalTime = useRef<number>(0);

  // ========================
  // USERNAME (ONCE)
  // ========================
  useEffect(() => {
    let name = localStorage.getItem("username");
    if (!name) {
      name = "user-" + Math.floor(Math.random() * 10000);
      localStorage.setItem("username", name);
    }
    setSender(name);
  }, []);

  // ========================
  // ROOM VERIFICATION
  // ========================
  useEffect(() => {
    if (!roomCode) return;
    const checkRoom = async () => {
      try {
        const res = await fetch("/api/room/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode }),
        });
        if (!res.ok) setRoomExists(false);
      } catch {
        setRoomExists(false);
      }
    };
    checkRoom();
  }, [roomCode]);

  // ========================
  // FETCH MESSAGES
  // ========================
  const fetchMessages = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/messages/get?roomCode=${roomCode}`);
      if (!res.ok) {
        if (res.status === 410) setRoomExists(false);
        return;
      }
      const data = await res.json();
      const msgs = await Promise.all(
        (data.messages || []).map(async (m: any) => {
          try {
            const enc = JSON.parse(m.text);
            const plain = await decryptText(enc, roomCode as string);
            return { ...m, text: plain };
          } catch {
            return { ...m, text: "🔒 Unable to decrypt" };
          }
        })
      );
      setMessages(msgs);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }, [roomCode]);

  // ========================
  // FETCH TTL
  // ========================
  const fetchTTL = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/room/ttl?roomCode=${roomCode}`);
      const data = await res.json();
      setTtl(data.ttl);
      if (data.ttl <= 0) {
        alert("Room expired! Redirecting to home...");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Failed to fetch TTL:", error);
    }
  }, [roomCode]);

  // ========================
  // POLLING MESSAGES & TTL
  // ========================
  useEffect(() => {
    if (!roomCode || !roomExists) return;
    fetchMessages();
    fetchTTL();
    const msgInterval = setInterval(fetchMessages, 2000); // Increased to reduce load
    const ttlInterval = setInterval(fetchTTL, 3000); // Increased to reduce load
    return () => {
      clearInterval(msgInterval);
      clearInterval(ttlInterval);
    };
  }, [roomCode, roomExists, fetchMessages, fetchTTL]);

  // ========================
  // POLL FOR INCOMING CALLS (before joining video)
  // ========================
  useEffect(() => {
    if (!roomCode || !sender || isVideoCallActive) return;

    const pollForCalls = async () => {
      try {
        // Get signals from last 15 seconds only
        const signals = await getSignalsMulti(
          roomCode as string,
          Date.now() - 15000
        );

        // Skip own signals and find who's currently active
        const joinTimes = new Map<string, number>();
        const leaveTimes = new Map<string, number>();

        for (const signal of signals) {
          if (signal.sender === sender) continue;

          if (signal.type === "join") {
            const current = joinTimes.get(signal.sender) || 0;
            if (signal.timestamp > current) {
              joinTimes.set(signal.sender, signal.timestamp);
            }
          }
          if (signal.type === "leave") {
            const current = leaveTimes.get(signal.sender) || 0;
            if (signal.timestamp > current) {
              leaveTimes.set(signal.sender, signal.timestamp);
            }
          }
        }

        // Find users who joined AFTER their last leave (or never left)
        const currentlyActive = new Set<string>();
        joinTimes.forEach((joinTime, user) => {
          const leaveTime = leaveTimes.get(user) || 0;
          if (joinTime > leaveTime) {
            currentlyActive.add(user);
          }
        });

        setActiveCallers(currentlyActive);

        // Show incoming call popup for first active caller
        if (currentlyActive.size > 0 && !incomingCall) {
          const firstCaller = Array.from(currentlyActive)[0];
          setIncomingCall({ from: firstCaller });
        } else if (currentlyActive.size === 0) {
          setIncomingCall(null);
        }
      } catch (error) {
        console.error("Error polling for calls:", error);
      }
    };

    const interval = setInterval(pollForCalls, 2000);
    pollForCalls();

    return () => clearInterval(interval);
  }, [roomCode, sender, isVideoCallActive, incomingCall]);

  // ========================
  // MULTI-USER VIDEO CALL SETUP
  // ========================
  const handleRemoteStreamAdded = useCallback(
    (userId: string, stream: MediaStream) => {
      console.log(`Remote stream added for: ${userId}`);
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, stream);
        return newMap;
      });
    },
    []
  );

  const handleRemoteStreamRemoved = useCallback((userId: string) => {
    console.log(`Remote stream removed for: ${userId}`);
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    setConnectionStates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  }, []);

  const handleSignalToSend = useCallback(
    async (signal: any) => {
      console.log(
        `🔔 handleSignalToSend called, roomCode=${roomCode}, signal=`,
        signal
      );
      if (!roomCode) {
        console.error("❌ roomCode is falsy, not sending signal!");
        return;
      }
      await sendSignalMulti(roomCode as string, signal);
    },
    [roomCode]
  );

  const handleConnectionStateChange = useCallback(
    (userId: string, state: string) => {
      setConnectionStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(userId, state);
        return newMap;
      });
    },
    []
  );

  // ========================
  // START VIDEO CALL
  // ========================
  const startVideoCall = async (isRejoin = false) => {
    if (!sender || !roomCode) return;

    try {
      console.log(
        `🚀 Starting video call as ${sender}${isRejoin ? " (rejoin)" : ""}`
      );

      const videoCall = new MultiUserVideoCall(roomCode as string, sender, {
        onRemoteStreamAdded: handleRemoteStreamAdded,
        onRemoteStreamRemoved: handleRemoteStreamRemoved,
        onSignalToSend: handleSignalToSend,
        onConnectionStateChange: handleConnectionStateChange,
      });

      videoCallRef.current = videoCall;

      // Start local video
      console.log("📹 Requesting camera/microphone...");
      const stream = await videoCall.startLocalVideo();
      console.log(`📹 Got local stream:`, stream);
      console.log(`📹 Video tracks:`, stream.getVideoTracks());
      console.log(`📹 Audio tracks:`, stream.getAudioTracks());

      // Set state immediately
      console.log("📹 Setting localStream state...");
      setLocalStream(stream);
      setIsVideoCallActive(true);
      setIncomingCall(null); // Clear any incoming call notification

      console.log("📹 States set, stream id:", stream.id);

      // Save video call state to localStorage for auto-rejoin on refresh
      localStorage.setItem(
        `videoCall_${roomCode}`,
        JSON.stringify({
          active: true,
          timestamp: Date.now(),
        })
      );

      // Reset signal tracking - look back 30 seconds to catch all active peers
      processedSignals.current.clear();
      lastSignalTime.current = Date.now() - 30000;

      // Announce join to room
      videoCall.announceJoin();

      // Re-announce multiple times to ensure connection
      setTimeout(() => {
        if (videoCallRef.current) {
          videoCallRef.current.announceJoin();
        }
      }, 1500);
      setTimeout(() => {
        if (videoCallRef.current) {
          videoCallRef.current.announceJoin();
        }
      }, 4000);
      // Immediately try to sync with any active peers by replaying recent join signals
      // This helps when both users join almost together and miss the first join/offer
      setTimeout(async () => {
        if (!videoCallRef.current || !roomCode || !sender) return;
        try {
          // Look back 30s for recent join signals
          const recentSignals = await getSignalsMulti(
            roomCode as string,
            Date.now() - 30000
          );
          const activeJoiners = new Set<string>();
          const leaveTimes = new Map<string, number>();

          for (const sig of recentSignals) {
            if (sig.sender === sender) continue;
            if (sig.type === "leave") {
              leaveTimes.set(sig.sender, sig.timestamp);
            }
            if (sig.type === "join") {
              const lastLeave = leaveTimes.get(sig.sender) || 0;
              if (sig.timestamp > lastLeave) {
                activeJoiners.add(sig.sender);
              }
            }
          }

          for (const userId of activeJoiners) {
            // Only initiate from the higher userId to avoid glare
            if (sender > userId) {
              console.log(`🤝 Sync call: initiating to ${userId} after join`);
              await videoCallRef.current.callUser(userId);
            } else {
              console.log(
                `🤝 Sync call: waiting for ${userId} to call (they have higher ID)`
              );
            }
          }
        } catch (err) {
          console.error("Failed to sync peers after join:", err);
        }
      }, 800);
    } catch (error) {
      console.error("Error starting video call:", error);
      // Clear saved state if failed
      localStorage.removeItem(`videoCall_${roomCode}`);
      if (!isRejoin) {
        alert("Failed to access camera/microphone. Please check permissions.");
      }
    }
  };

  // ========================
  // ACCEPT INCOMING CALL
  // ========================
  const acceptCall = () => {
    setIncomingCall(null);
    startVideoCall();
  };

  // ========================
  // DECLINE INCOMING CALL
  // ========================
  const declineCall = () => {
    setIncomingCall(null);
  };

  // ========================
  // AUTO-REJOIN VIDEO CALL ON PAGE REFRESH
  // ========================
  useEffect(() => {
    if (!sender || !roomCode || isVideoCallActive) return;

    const savedState = localStorage.getItem(`videoCall_${roomCode}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Check if saved state is recent (within last 30 seconds - enough time for refresh)
        const isRecent = Date.now() - state.timestamp < 30000;

        if (state.active && isRecent) {
          console.log("Auto-rejoining video call after refresh...");
          // Small delay to ensure everything is initialized
          setTimeout(() => {
            startVideoCall(true);
          }, 500);
        } else {
          // Clear old state
          localStorage.removeItem(`videoCall_${roomCode}`);
        }
      } catch {
        localStorage.removeItem(`videoCall_${roomCode}`);
      }
    }
  }, [sender, roomCode]); // Only run once when sender and roomCode are available

  // ========================
  // SIGNAL POLLING
  // ========================
  useEffect(() => {
    if (!isVideoCallActive || !videoCallRef.current || !roomCode || !sender)
      return;

    const pollSignals = async () => {
      try {
        const signals = await getSignalsMulti(
          roomCode as string,
          lastSignalTime.current
        );

        for (const signal of signals) {
          // Include joinId in signalId for join signals to make each join unique
          const joinId =
            signal.type === "join" && signal.data?.joinId
              ? `-${signal.data.joinId}`
              : "";
          const signalId = `${signal.type}-${signal.sender}-${
            signal.target || "broadcast"
          }-${signal.timestamp}${joinId}`;

          // Skip already processed signals
          if (processedSignals.current.has(signalId)) continue;
          processedSignals.current.add(signalId);

          console.log(
            `Processing signal: ${signal.type} from ${signal.sender}${
              joinId ? ` (joinId: ${signal.data?.joinId})` : ""
            }`
          );

          // Let the video call handle the signal
          await videoCallRef.current?.handleSignal(signal);

          lastSignalTime.current = Math.max(
            lastSignalTime.current,
            signal.timestamp
          );
        }
      } catch (error) {
        console.error("Error polling signals:", error);
      }
    };

    // Poll more frequently for faster connection
    const interval = setInterval(pollSignals, 500);
    pollSignals(); // Initial poll

    return () => clearInterval(interval);
  }, [isVideoCallActive, roomCode, sender]);

  // ========================
  // END VIDEO CALL
  // ========================
  const endVideoCall = () => {
    if (videoCallRef.current) {
      videoCallRef.current.disconnect();
      videoCallRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams(new Map());
    setConnectionStates(new Map());
    setIsVideoCallActive(false);
    processedSignals.current.clear();

    // Clear saved video call state
    localStorage.removeItem(`videoCall_${roomCode}`);
  };

  // ========================
  // MEDIA CONTROLS
  // ========================
  const toggleVideo = () => {
    if (videoCallRef.current) {
      const newState = !isVideoEnabled;
      videoCallRef.current.toggleVideo(newState);
      setIsVideoEnabled(newState);
    }
  };

  const toggleAudio = () => {
    if (videoCallRef.current) {
      const newState = !isAudioEnabled;
      videoCallRef.current.toggleAudio(newState);
      setIsAudioEnabled(newState);
    }
  };

  // ========================
  // SEND MESSAGE
  // ========================
  const sendMessage = async () => {
    if (!text.trim() || !sender || isSending) return;
    setIsSending(true);
    try {
      const encrypted = await encryptText(text, roomCode as string);
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          sender,
          text: JSON.stringify(encrypted),
        }),
      });
      setText("");
      fetchMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // ========================
  // DESTROY ROOM
  // ========================
  const destroyRoom = async () => {
    endVideoCall();
    await fetch(`/api/room/destroy?roomCode=${roomCode}`, { method: "DELETE" });
    window.location.href = "/";
  };

  // ========================
  // CLEANUP ON UNMOUNT (but keep state for refresh)
  // ========================
  useEffect(() => {
    // Update timestamp periodically to keep session alive
    const keepAlive = setInterval(() => {
      if (isVideoCallActive && roomCode) {
        localStorage.setItem(
          `videoCall_${roomCode}`,
          JSON.stringify({
            active: true,
            timestamp: Date.now(),
          })
        );
      }
    }, 5000);

    // Only disconnect on actual page unload, not on React re-renders
    const handleBeforeUnload = () => {
      if (videoCallRef.current) {
        videoCallRef.current.disconnect();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(keepAlive);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Don't disconnect here - React Strict Mode causes double mount/unmount
      // Don't clear localStorage here - let auto-rejoin handle it
    };
  }, [isVideoCallActive, roomCode]);

  // ========================
  // ROOM NOT FOUND
  // ========================
  if (!roomExists) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 px-4">
        <div className="text-center bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Room Not Found</h2>
          <p className="text-zinc-400 text-sm mb-6">
            This room may have expired or does not exist.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  // Calculate grid columns based on participant count
  const totalParticipants = 1 + remoteStreams.size; // local + remotes
  const gridCols =
    totalParticipants <= 1
      ? 1
      : totalParticipants <= 4
      ? 2
      : totalParticipants <= 9
      ? 3
      : 4;

  // ========================
  // MAIN UI
  // ========================
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Logo/Back */}
          <a
            href="/"
            className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </a>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-emerald-400 text-base font-bold tracking-wider">
                {roomCode}
              </p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  ttl <= 30
                    ? "bg-red-500/20 text-red-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {ttl}s
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              {sender} •{" "}
              {remoteStreams.size > 0
                ? `${remoteStreams.size + 1} in room`
                : "Only you"}
            </p>
          </div>
        </div>
        <button
          onClick={destroyRoom}
          className="text-xs border border-red-500/50 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all"
        >
          End
        </button>
      </header>

      {/* Incoming Call Popup */}
      {incomingCall && !isVideoCallActive && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 md:p-8 text-center max-w-sm w-full border border-zinc-700 shadow-2xl">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 flex items-center justify-center text-emerald-400">
                <VideoIcon />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Incoming Call</h3>
            <p className="text-zinc-400 text-sm mb-6">
              <span className="text-emerald-400 font-semibold">
                {incomingCall.from}
              </span>{" "}
              wants to video chat
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={declineCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-lg shadow-red-500/30"
                title="Decline"
              >
                <PhoneOffIcon />
              </button>
              <button
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors shadow-lg shadow-emerald-500/30"
                title="Accept"
              >
                <VideoIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Indicator (when someone is in call but you haven't joined) */}
      {activeCallers.size > 0 && !isVideoCallActive && !incomingCall && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-xs">
              {Array.from(activeCallers).join(", ")} in call
            </span>
          </div>
          <button
            onClick={() => startVideoCall()}
            className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-all"
          >
            Join
          </button>
        </div>
      )}

      {/* Video Section */}
      <div className="border-b border-zinc-800/50 p-3 md:p-4 bg-zinc-900/50">
        {!isVideoCallActive ? (
          <div className="text-center py-6 md:py-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400">
              <VideoIcon />
            </div>
            <button
              onClick={() => startVideoCall()}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 mx-auto shadow-lg shadow-blue-500/20"
            >
              <VideoIcon />
              Start Video Call
            </button>
            <p className="text-zinc-500 text-xs mt-3">
              Encrypted peer-to-peer video
            </p>
          </div>
        ) : (
          <div>
            {/* Video Grid - Mobile optimized */}
            <div
              className={`grid gap-2 md:gap-3 mb-3 ${
                totalParticipants <= 1
                  ? "grid-cols-1 max-w-md mx-auto"
                  : totalParticipants === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3"
              }`}
            >
              {/* Local Video (You) */}
              <VideoTile
                key={localStream?.id || "local"}
                stream={localStream}
                label="You"
                isMuted={true}
                isMirrored={true}
              />

              {/* Remote Videos - One tile per user */}
              {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                <VideoTile
                  key={`${userId}-${stream.id}`}
                  stream={stream}
                  label={userId}
                  isMuted={false}
                  isMirrored={false}
                />
              ))}

              {/* Placeholder if waiting */}
              {remoteStreams.size === 0 && (
                <div className="relative bg-zinc-800/50 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-zinc-700/50">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-700/50 flex items-center justify-center mx-auto mb-2">
                      <span className="text-zinc-500 text-lg">?</span>
                    </div>
                    <p className="text-zinc-500 text-xs">
                      Waiting for others to join...
                    </p>
                    {connectionStates.size > 0 && (
                      <div className="mt-2 text-[10px] text-zinc-600">
                        {Array.from(connectionStates.entries()).map(
                          ([userId, state]) => (
                            <div key={userId}>
                              {userId.slice(0, 8)}...: {state}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="flex justify-center gap-2 md:gap-3">
              <button
                onClick={toggleVideo}
                className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  isVideoEnabled
                    ? "bg-zinc-700/80 hover:bg-zinc-600"
                    : "bg-red-500 hover:bg-red-600"
                } text-white`}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoEnabled ? <VideoIcon /> : <VideoOffIcon />}
              </button>
              <button
                onClick={toggleAudio}
                className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                  isAudioEnabled
                    ? "bg-zinc-700/80 hover:bg-zinc-600"
                    : "bg-red-500 hover:bg-red-600"
                } text-white`}
                title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
              </button>
              <button
                onClick={endVideoCall}
                className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-all"
                title="Leave call"
              >
                <PhoneOffIcon />
              </button>
            </div>

            {/* Connection States - Minimal */}
            {connectionStates.size > 0 && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-full">
                  {Array.from(connectionStates.entries()).map(
                    ([userId, state]) => (
                      <span
                        key={userId}
                        className="flex items-center gap-1 text-[10px]"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            state === "connected"
                              ? "bg-emerald-400"
                              : "bg-yellow-400"
                          }`}
                        />
                        <span className="text-zinc-400">{userId}</span>
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto p-3 md:p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-500"
                >
                  <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm">No messages yet</p>
              <p className="text-zinc-600 text-xs">
                Messages are end-to-end encrypted
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === sender ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[70%] px-3 py-2 rounded-2xl ${
                    msg.sender === sender
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-br-md"
                      : "bg-zinc-800/80 text-zinc-100 rounded-bl-md"
                  }`}
                >
                  {msg.sender !== sender && (
                    <p className="text-[10px] text-zinc-400 mb-0.5 font-medium">
                      {msg.sender}
                    </p>
                  )}
                  <p className="break-words text-sm">{msg.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-zinc-800/50 p-3 bg-zinc-900/50">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              placeholder="Type a message..."
              className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 text-sm"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !text.trim()}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span className="hidden md:inline">Send</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="md:hidden"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
