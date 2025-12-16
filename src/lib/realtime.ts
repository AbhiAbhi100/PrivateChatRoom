import { Realtime } from "@upstash/realtime"

export const realtime = new Realtime({
  url: process.env.UPSTASH_REALTIME_REST_URL!,
  token: process.env.UPSTASH_REALTIME_REST_TOKEN!,
})
