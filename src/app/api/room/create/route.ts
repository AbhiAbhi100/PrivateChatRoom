//serverless Api ka rule : 1>Function chalega 2>Kaam karega 3>Response deke khatam

import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import crypto from "crypto"

const ROOM_TTL_SECONDS = 60 * 10 // 10 minutes

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { password } = body

  const roomId = crypto.randomUUID()

  const passwordHash = password
    ? crypto.createHash("sha256").update(password).digest("hex")
    : null

  await redis.set(
    `room:${roomId}`,
    JSON.stringify({
      createdAt: Date.now(),
      passwordHash,
    }),
    "EX",
    ROOM_TTL_SECONDS
  )

  return NextResponse.json({
    roomId,
    protected: !!password,
  })
}


//CRUX (yaad rakh)
/**
 * route.ts = serverless function
 * POST()=HTTP POST handler
 * crypto.randomUUID()=random unique id banane ke liye
 */

