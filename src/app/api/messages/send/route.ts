import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { nanoid } from "nanoid"

export async function POST(req: Request) {
  const body = await req.json()
  const { roomId, sender, text } = body

  if (!roomId || !sender || !text) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    )
  }

  const exists = await redis.exists(`room:${roomId}`)
  if (!exists) {
    return NextResponse.json(
      { error: "ROOM_EXPIRED" },
      { status: 410 }
    )
  }

  const message = {
    id: nanoid(),
    sender,
    text,
    timestamp: Date.now(),
  }

  await redis.rpush(
    `messages:${roomId}`,
    JSON.stringify(message)
  )

  return NextResponse.json({ message })
}
