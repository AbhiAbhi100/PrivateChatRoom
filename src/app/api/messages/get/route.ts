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
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const exists = await redis.exists(`room:${roomId}`);
  if (!exists) {
    return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
  }

  const raw = await redis.lrange(`messages:${roomId}`, 0, -1);

  // ✅ For list operations, manual JSON parsing is needed
  const messages: MessageData[] = raw.map((m): MessageData => {
    try {
      return typeof m === "string" ? JSON.parse(m) : m;
    } catch {
      return m as unknown as MessageData;
    }
  });

  return NextResponse.json({ messages });
}
