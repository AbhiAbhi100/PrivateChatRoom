import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const ROOM_TTL = 60 * 10; // ⏱️ 10 minutes

// Generate unique 6-digit room code
async function generateRoomCode(): Promise<string> {
  let roomCode: string;
  let exists: number;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique room code");
    }
    roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    exists = await redis.exists(`room:${roomCode}`);
    attempts++;
  } while (exists > 0);

  return roomCode;
}

export async function POST() {
  try {
    const roomCode = await generateRoomCode();

    const roomData = {
      createdAt: Date.now(),
    };

    // ✅ ROOM META - Store with room code as key
    await redis.set(`room:${roomCode}`, roomData, { ex: ROOM_TTL });

    // ✅ MESSAGE LIST TTL
    await redis.expire(`messages:${roomCode}`, ROOM_TTL);

    return NextResponse.json({ roomCode });
  } catch (error) {
    console.error("Room creation error:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
