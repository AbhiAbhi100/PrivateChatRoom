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

  // 💬 chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [ttl, setTtl] = useState<number>(0);

  // ========================
  // HELPERS
  // ========================
  const fetchMessages = async () => {
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
  };

  const fetchTTL = async () => {
    const res = await fetch(`/api/room/ttl?roomId=${roomId}`);
    const data = await res.json();
    setTtl(data.ttl);
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
};


  // ========================
  // ========================
  // REALTIME + POLLING (AFTER VERIFY)
  // ========================
  useEffect(() => {
    if (!roomId || !verified) return;

    fetchMessages();
    fetchTTL();

    const realtime = new Realtime({
      url: process.env.NEXT_PUBLIC_UPSTASH_REALTIME_REST_URL!,
      token: process.env.NEXT_PUBLIC_UPSTASH_REALTIME_REST_TOKEN!,
    });

    realtime.subscribe(`room:${roomId}`, () => {
      fetchMessages();
    });

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
    if (!text.trim() || !sender) return;

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
          />

          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

          <button
            onClick={verifyRoom}
            className="w-full bg-green-500 text-black py-2 rounded font-bold"
          >
            Join Room
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
          <p className="text-xs text-red-400 mt-1">Expires in {ttl}s</p>
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
        {messages.map((m) => {
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
        })}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 text-black px-4 rounded font-bold"
        >
          Send
        </button>
      </div>
    </main>
  );
}
