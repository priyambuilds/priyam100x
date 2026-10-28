import type { Redis } from "ioredis"

const TICKET_TTL_SECONDS = 30

export type TicketPayload = { userId: string; /** JWT expiry, unix seconds */ exp: number }

// A one-time ticket keeps the real JWT out of the WebSocket URL (and proxy logs).
export async function createTicket(redis: Redis, payload: TicketPayload): Promise<string> {
    const ticket = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url")
    await redis.set(`ws:ticket:${ticket}`, JSON.stringify(payload), "EX", TICKET_TTL_SECONDS)
    return ticket
}

// GETDEL is atomic: of two simultaneous connects with one ticket, only one wins.
export async function consumeTicket(redis: Redis, ticket: string): Promise<TicketPayload | null> {
    const raw = await redis.getdel(`ws:ticket:${ticket}`)
    return raw ? (JSON.parse(raw) as TicketPayload) : null
}
