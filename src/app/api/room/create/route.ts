import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";
import { nanoid } from "nanoid";

const ROOM_TTL = 60 * 10; // ⏱️ 10 minutes

export async function POST(req: Request) {
  const body = await req.json();
  const { password } = body;

  const roomId = nanoid();

  let passwordHash: string | null = null;

  if (password) {
    passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  }

  const roomData = {
    id: roomId,
    passwordHash,
    createdAt: Date.now(),
  };

  // ✅ ROOM META - Upstash Redis handles JSON serialization automatically
  await redis.set(`room:${roomId}`, roomData, { ex: ROOM_TTL });

  // ✅ MESSAGE LIST TTL
  await redis.expire(`messages:${roomId}`, ROOM_TTL);

  return NextResponse.json({ roomId });
}
