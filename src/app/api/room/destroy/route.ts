import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get("roomId")

  if (!roomId) {
    return NextResponse.json(
      { error: "roomId required" },
      { status: 400 }
    )
  }

  await redis.del(`room:${roomId}`)
  await redis.del(`messages:${roomId}`)

  return NextResponse.json({ success: true })
}
