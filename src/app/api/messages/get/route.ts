import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// 📝 Type definition for message data
type MessageData = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    }

    // Validate 6-digit format
    if (!/^\d{6}$/.test(roomCode)) {
      return NextResponse.json(
        { error: "Invalid room code format" },
        { status: 400 }
      );
    }

    const exists = await redis.exists(`room:${roomCode}`);
    if (!exists) {
      return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
    }

    const raw = await redis.lrange(`messages:${roomCode}`, 0, -1);

    // ✅ For list operations, manual JSON parsing is needed
    const messages: MessageData[] = raw.map((m): MessageData => {
      try {
        return typeof m === "string" ? JSON.parse(m) : m;
      } catch {
        return m as unknown as MessageData;
      }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages get error:", error);
    return NextResponse.json(
      { error: "Internal error", messages: [] },
      { status: 500 }
    );
  }
}
