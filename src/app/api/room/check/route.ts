import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// 📝 Type definition for room data
type RoomData = {
  createdAt: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomCode } = body;

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

    const room = (await redis.get(`room:${roomCode}`)) as RoomData | null;

    // ❌ room not found → TTL expired
    if (!room) {
      return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Room check error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
