import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

// 📝 Type definitions
type MessageData = {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
};

type RequestBody = {
  roomId: string;
  sender: string;
  text: string;
};

export async function POST(req: Request) {
  const body: RequestBody = await req.json();
  const { roomId, sender, text } = body;

  if (!roomId || !sender || !text) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const exists = await redis.exists(`room:${roomId}`);
  if (!exists) {
    return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
  }

  const message: MessageData = {
    id: nanoid(),
    sender,
    text,
    timestamp: Date.now(),
  };

  await redis.rpush(`messages:${roomId}`, JSON.stringify(message));

  return NextResponse.json({ message });
}
