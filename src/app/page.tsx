"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Home() {
  const router = useRouter()
  const [password, setPassword] = useState("")

  const createRoom = async () => {
    const res = await fetch("/api/room/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: password || undefined,
      }),
    })

    const data = await res.json()
    router.push(`/room/${data.roomId}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <h1 className="text-xl font-bold mb-4 text-center">
          🔐 Private Chat
        </h1>

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Optional room password"
          type="password"
          className="w-full mb-4 bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
        />

        <button
          onClick={createRoom}
          className="w-full bg-green-500 text-black py-2 rounded font-bold"
        >
          Create Room
        </button>
      </div>
    </main>
  )
}
