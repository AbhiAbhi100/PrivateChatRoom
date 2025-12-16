import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { realtime } from "@/lib/realtime"

export async function POST(req: Request) {
  const body = await req.json()
  const { roomId, sender, text } = body

  if (!roomId || !sender || !text) {
    return NextResponse.json(
      { error: "roomId, sender, text required" },
      { status: 400 }
    )
  }

  // check room exists
  const exists = await redis.exists(`room:${roomId}`)
  if (!exists) {
    return NextResponse.json(
      { error: "ROOM_EXPIRED_OR_NOT_FOUND" },
      { status: 404 }
    )
  }

  const message = {
    id: crypto.randomUUID(),
    sender,
    text,
    timestamp: Date.now(),
  }

  // save message
  await redis.rpush(
    `messages:${roomId}`,
    JSON.stringify(message)
  )

  // 🔥 REALTIME EVENT
  await realtime.publish(`room:${roomId}`, {
    type: "chat.message",
  })

  return NextResponse.json({ message })
}
