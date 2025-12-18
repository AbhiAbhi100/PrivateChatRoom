import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

type SignalData = {
  type: "join" | "offer" | "answer" | "ice-candidate" | "leave";
  sender: string;
  target?: string; // Who this signal is for (undefined = broadcast)
  data?: any;
  timestamp: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomCode, type, sender, target, data } = body;

    if (!roomCode || !type || !sender) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Check if room exists
    const exists = await redis.exists(`room:${roomCode}`);
    if (!exists) {
      return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
    }

    const timestamp = Date.now();
    const signal: SignalData = {
      type,
      sender,
      target,
      data,
      timestamp,
    };

    // Key structure: video:{roomCode}:{type}:{sender}:{target}:{timestamp}
    // Using timestamp ensures ICE candidates don't overwrite each other
    // Target is included to allow filtering
    const targetPart = target || "broadcast";
    const signalKey = `video:${roomCode}:${type}:${sender}:${targetPart}:${timestamp}`;

    // Shorter TTL for ICE candidates (30s), longer for offers/answers (60s), join/leave (90s)
    const ttl =
      type === "ice-candidate"
        ? 30
        : type === "join" || type === "leave"
        ? 90
        : 60;
    await redis.set(signalKey, JSON.stringify(signal), { ex: ttl });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signal POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    const since = parseInt(searchParams.get("since") || "0");

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    }

    // Get all video signaling keys for this room
    const pattern = `video:${roomCode}:*`;
    const keys = await redis.keys(pattern);

    const signals: SignalData[] = [];

    // Use pipeline for better performance
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const results = await pipeline.exec();

      for (const result of results) {
        if (result) {
          const signal: SignalData =
            typeof result === "string" ? JSON.parse(result) : result;

          // Only return signals newer than 'since'
          if (signal.timestamp > since) {
            signals.push(signal);
          }
        }
      }
    }

    // Sort by timestamp to process in order
    signals.sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Signal GET error:", error);
    return NextResponse.json(
      { error: "Internal error", signals: [] },
      { status: 500 }
    );
  }
}
