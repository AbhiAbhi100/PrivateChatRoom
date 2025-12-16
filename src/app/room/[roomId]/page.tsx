"use client";
import { encryptText, decryptText } from "@/lib/crypto";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Realtime } from "@upstash/realtime";

type Message = {
  id: string;
  sender: string;
  text: string;
};

export default function RoomPage() {
  const { roomId } = useParams();

  // 🔐 password flow
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // 💬 chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [ttl, setTtl] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [otherUsers, setOtherUsers] = useState<string[]>([]);

  // ========================
  // HELPERS
  // ========================
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/get?roomId=${roomId}`);
      const data = await res.json();

      const msgs = await Promise.all(
        (data.messages || []).map(async (m: any) => {
          // 🔐 try decrypt only if password exists
          if (password) {
            try {
              const enc = JSON.parse(m.text);
              const plain = await decryptText(enc, password);
              return { ...m, text: plain };
            } catch {
              return { ...m, text: "🔒 Unable to decrypt" };
            }
          }

          // 🔓 normal room
          return m;
        })
      );

      setMessages(msgs);

      // Track other users
      const uniqueUsers = [
        ...new Set(msgs.map((m) => m.sender).filter((s) => s !== sender)),
      ];
      setOtherUsers(uniqueUsers);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchTTL = async () => {
    try {
      const res = await fetch(`/api/room/ttl?roomId=${roomId}`);
      const data = await res.json();
      setTtl(data.ttl);

      // 🚨 Auto-redirect when TTL reaches 0
      if (data.ttl <= 0) {
        // Show toast notification
        alert("🕒 Room expired! Redirecting to home...");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Failed to fetch TTL:", error);
    }
  };

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
  // PASSWORD VERIFY
  // ========================
  const verifyRoom = async () => {
    setError("");
    setIsConnecting(true);

    try {
      const res = await fetch("/api/room/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          password: password || undefined,
        }),
      });

      // ✅ ALWAYS parse JSON ONCE
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        setError("Server error");
        return;
      }

      if (!res.ok) {
        // 🔴 EXACT error handling
        if (data.error === "PASSWORD_REQUIRED") {
          setError("Password required 🔐");
        } else if (data.error === "WRONG_PASSWORD") {
          setError("Wrong password ❌");
        } else if (data.error === "ROOM_EXPIRED") {
          setError("Room expired ⏱️ Create a new room");
        } else {
          setError("Access denied");
        }
        return;
      }

      // ✅ SUCCESS
      setVerified(true);
    } catch (error) {
      setError("Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  // ========================
  // ========================
  // REALTIME + POLLING (AFTER VERIFY)
  // ========================
  useEffect(() => {
    if (!roomId || !verified) return;

    fetchMessages();
    fetchTTL();

    // TODO: Fix Realtime subscription for deployment\n    // const realtime = new Realtime({\n    //   url: process.env.NEXT_PUBLIC_UPSTASH_REALTIME_REST_URL!,\n    //   token: process.env.NEXT_PUBLIC_UPSTASH_REALTIME_REST_TOKEN!,\n    // } as any);\n\n    // realtime.subscribe(`room:${roomId}`);\n    // \n    // realtime.on('message', () => {\n    //   fetchMessages();\n    // });", "oldString": "    const realtime = new Realtime({\n      url: process.env.NEXT_PUBLIC_UPSTASH_REALTIME_REST_URL!,\n      token: process.env.NEXT_PUBLIC_UPSTASH_REALTIME_REST_TOKEN!,\n    } as any);\n\n    realtime.subscribe(`room:${roomId}`);\n    \n    realtime.on('message', () => {\n      fetchMessages();\n    });"}

    const msgInterval = setInterval(fetchMessages, 1500);
    const ttlInterval = setInterval(fetchTTL, 1000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(ttlInterval);
    };
  }, [roomId, verified]);

  // ========================
  // SEND MESSAGE
  // ========================
  const sendMessage = async () => {
    if (!text.trim() || !sender || isSending) return;

    setIsSending(true);
    try {
      let payloadText = text;

      // 🔐 encrypt ONLY if password exists
      if (password) {
        const encrypted = await encryptText(text, password);
        payloadText = JSON.stringify(encrypted);
      }

      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          sender,
          text: payloadText,
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
    await fetch(`/api/room/destroy?roomId=${roomId}`, {
      method: "DELETE",
    });
    window.location.href = "/";
  };

  // ========================
  // CONNECTING SCREEN
  // ========================
  if (isConnecting) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-lg">🔗 Connecting...</p>
          <p className="text-sm text-zinc-400 mt-2">Joining the room</p>
        </div>
      </main>
    );
  }

  // ========================
  // PASSWORD SCREEN
  // ========================
  if (!verified) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-sm">
          <h2 className="text-lg font-bold mb-3">🔒 Enter Room Password</h2>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Room password"
            className="w-full mb-3 bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
            disabled={isConnecting}
          />

          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

          <button
            onClick={verifyRoom}
            disabled={isConnecting}
            className="w-full bg-green-500 text-black py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? "Connecting..." : "Join Room"}
          </button>
        </div>
      </main>
    );
  }

  // ========================
  // CHAT UI
  // ========================
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 flex justify-between items-start">
        <div>
          <p className="text-xs text-zinc-400">Room</p>
          <p className="font-mono text-green-500 truncate">{roomId}</p>
          <p className="text-xs text-zinc-400 mt-1">
            You: <span className="text-zinc-200">{sender}</span>
          </p>
          {otherUsers.length > 0 && (
            <p className="text-xs text-zinc-400 mt-1">
              Others:{" "}
              <span className="text-blue-400">{otherUsers.join(", ")}</span>
            </p>
          )}
          <p className="text-xs text-red-400 mt-1">
            {ttl <= 30 ? "⚠️ " : ""}Expires in {ttl}s
          </p>
        </div>

        <button
          onClick={destroyRoom}
          className="text-xs border border-red-400 text-red-400 px-3 py-1 rounded"
        >
          Destroy Room
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingMessages ? (
          // 💀 SKELETON LOADING
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`flex ${
                  i % 2 === 0 ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    i % 2 === 0 ? "bg-zinc-700" : "bg-zinc-800"
                  } animate-pulse`}
                >
                  <div className="h-4 bg-zinc-600 rounded mb-2"></div>
                  <div className="h-4 bg-zinc-600 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender === sender;
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg text-sm
                    ${
                      isMe
                        ? "bg-green-500 text-black rounded-br-none"
                        : "bg-zinc-800 text-zinc-100 rounded-bl-none"
                    }`}
                >
                  {!isMe && (
                    <p className="text-xs text-zinc-400 mb-1">{m.sender}</p>
                  )}
                  <p>{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 disabled:opacity-50"
          disabled={isSending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSending) sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isSending || !text.trim()}
          className="bg-green-500 text-black px-4 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
        >
          {isSending ? (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </main>
  );
}
