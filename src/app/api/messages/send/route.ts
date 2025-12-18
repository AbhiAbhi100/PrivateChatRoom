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
  roomCode: string;
  sender: string;
  text: string;
};

// Max message length to prevent abuse
const MAX_MESSAGE_LENGTH = 5000;
const MAX_SENDER_LENGTH = 50;

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { roomCode, sender, text } = body;

    if (!roomCode || !sender || !text) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Validate room code format
    if (!/^\d{6}$/.test(roomCode)) {
      return NextResponse.json(
        { error: "Invalid room code format" },
        { status: 400 }
      );
    }

    // Validate message length
    if (text.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    // Validate sender length
    if (sender.length > MAX_SENDER_LENGTH) {
      return NextResponse.json(
        { error: "Sender name too long" },
        { status: 400 }
      );
    }

    const exists = await redis.exists(`room:${roomCode}`);
    if (!exists) {
      return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
    }

    const message: MessageData = {
      id: nanoid(),
      sender,
      text,
      timestamp: Date.now(),
    };

    await redis.rpush(`messages:${roomCode}`, JSON.stringify(message));

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
