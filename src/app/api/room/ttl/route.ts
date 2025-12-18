import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json({ ttl: 0 });
    }

    // Validate 6-digit format
    if (!/^\d{6}$/.test(roomCode)) {
      return NextResponse.json({ ttl: 0 });
    }

    const ttl = await redis.ttl(`room:${roomCode}`);

    return NextResponse.json({
      ttl: ttl > 0 ? ttl : 0,
    });
  } catch (error) {
    console.error("TTL check error:", error);
    return NextResponse.json({ ttl: 0 });
  }
}
