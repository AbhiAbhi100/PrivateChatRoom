import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get("roomId")

  if (!roomId) {
    return NextResponse.json(
      { error: "roomId required" },
      { status: 400 }
    )
  }

  const exists = await redis.exists(`room:${roomId}`)
  if (!exists) {
    return NextResponse.json(
      { error: "ROOM_EXPIRED_OR_NOT_FOUND" },
      { status: 404 }
    )
  }

  const rawMessages = await redis.lrange(
    `messages:${roomId}`,
    0,
    -1
  )

  const messages = rawMessages.map((m) => JSON.parse(m))

  return NextResponse.json({ messages })
}
