import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function DELETE(req: Request) {
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

    await redis.del(`room:${roomCode}`);
    await redis.del(`messages:${roomCode}`);

    // Clean up all video signaling keys
    const videoKeys = await redis.keys(`video:${roomCode}:*`);
    if (videoKeys.length > 0) {
      await redis.del(...videoKeys);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Room destroy error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
