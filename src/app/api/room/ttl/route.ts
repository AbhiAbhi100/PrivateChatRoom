import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get("roomId")

  if (!roomId) {
    return NextResponse.json({ ttl: 0 })
  }

  const ttl = await redis.ttl(`room:${roomId}`)

  return NextResponse.json({
    ttl: ttl > 0 ? ttl : 0,
  })
}
