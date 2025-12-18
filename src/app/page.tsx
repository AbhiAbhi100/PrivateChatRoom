"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Icons
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      setError("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!/^\d{6}$/.test(roomCode)) {
      setError("Please enter a valid 6-digit room code");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const res = await fetch("/api/room/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "ROOM_EXPIRED") {
          setError("Room not found or expired");
        } else {
          setError("Failed to join room");
        }
        return;
      }

      router.push(`/room/${roomCode}`);
    } catch (err) {
      setError("Connection failed");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-12">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 mb-6 text-emerald-400">
            <ShieldIcon />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Private Room
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto">
            Secure, encrypted video calls & messaging.
            <span className="text-emerald-400"> No sign-up required.</span>
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/50">
            
            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit mx-auto">
              <LockIcon />
              <span className="text-emerald-400 text-xs font-medium">End-to-End Encrypted</span>
            </div>

            {/* Join Room Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Enter Room Code
              </label>
              <input
                value={roomCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setRoomCode(value);
                  setError("");
                }}
                placeholder="● ● ● ● ● ●"
                className="w-full bg-zinc-800/50 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono placeholder:tracking-[0.3em] placeholder:text-zinc-600 transition-colors outline-none"
                maxLength={6}
                inputMode="numeric"
              />

              <button
                onClick={joinRoom}
                disabled={isJoining || roomCode.length !== 6}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <VideoIcon />
                {isJoining ? "Joining..." : "Join Room"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-zinc-700/50"></div>
              <span className="px-4 text-xs text-zinc-500 uppercase tracking-wider">or start fresh</span>
              <div className="flex-1 border-t border-zinc-700/50"></div>
            </div>

            {/* Create Room Section */}
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              {isCreating ? "Creating Secure Room..." : "Create Private Room"}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
              <div className="text-emerald-400 flex justify-center mb-2">
                <ClockIcon />
              </div>
              <p className="text-[10px] md:text-xs text-zinc-400">Auto-expires in 10 min</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
              <div className="text-emerald-400 flex justify-center mb-2">
                <UsersIcon />
              </div>
              <p className="text-[10px] md:text-xs text-zinc-400">Multi-user video</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center">
              <div className="text-emerald-400 flex justify-center mb-2">
                <MessageIcon />
              </div>
              <p className="text-[10px] md:text-xs text-zinc-400">Encrypted chat</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-zinc-600 text-xs mt-6">
            🔒 Your conversations are encrypted using the room code as the secret key.
            <br />
            No data is stored after the room expires.
          </p>
        </div>
      </div>
    </main>
  );
}
