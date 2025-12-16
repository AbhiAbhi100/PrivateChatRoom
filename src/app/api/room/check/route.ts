import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import crypto from "crypto"

export async function POST(req: Request) {
  const body = await req.json()
  const { roomId, password } = body

  if (!roomId) {
    return NextResponse.json(
      { error: "roomId required" },
      { status: 400 }
    )
  }

  const raw = await redis.get(`room:${roomId}`)
  if (!raw) {
    return NextResponse.json(
      { error: "ROOM_EXPIRED_OR_NOT_FOUND" },
      { status: 404 }
    )
  }

  const room = JSON.parse(raw)

  // room is protected
  if (room.passwordHash) {
    if (!password) {
      return NextResponse.json(
        { error: "PASSWORD_REQUIRED" },
        { status: 401 }
      )
    }

    const hash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex")

    if (hash !== room.passwordHash) {
      return NextResponse.json(
        { error: "INVALID_PASSWORD" },
        { status: 403 }
      )
    }
  }

  return NextResponse.json({ success: true })
}


//IMportant points
//redis.exists() ====> 1 ya 0
//TTL expire ho gaya key hi nhi milega
//yehi join gate hai
