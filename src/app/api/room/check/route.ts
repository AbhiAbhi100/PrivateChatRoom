import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";

export async function POST(req: Request) {
  // ✅ req.json() ALREADY OBJECT deta hai
  const body = await req.json();
  const { roomId, password } = body;

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const room = await redis.get(`room:${roomId}`);

  // ❌ room nahi mila → TTL expired
  if (!room) {
    return NextResponse.json({ error: "ROOM_EXPIRED" }, { status: 410 });
  }

  // ✅ Upstash Redis automatically deserializes JSON, no need for JSON.parse
  // const room = JSON.parse(roomRaw) // ❌ This causes the error

  // 🔐 PASSWORD CHECK
  if (room.passwordHash) {
    if (!password) {
      return NextResponse.json({ error: "PASSWORD_REQUIRED" }, { status: 401 });
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");

    if (hash !== room.passwordHash) {
      return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true });
}
