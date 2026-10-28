import type { Redis } from "ioredis";

export type RateLimit = { max: number; windowSeconds: number };

// Fixed-window counter. INCR and EXPIRE run in one MULTI, so a crash between
// them can't leave a counter with no TTL (a permanent lockout).
export async function isRateLimited(
    redis: Redis,
    scope: string,
    subject: string,
    limit: RateLimit,
): Promise<boolean> {
    const window = Math.floor(Date.now() / (limit.windowSeconds * 1000));
    const key = `rl:${scope}:${subject}:${window}`;
    try {
        const results = await redis.multi().incr(key).expire(key, limit.windowSeconds).exec();
        return Number(results?.[0]?.[1] ?? 0) > limit.max;
    } catch (err) {
        // Policy: fail open. A Redis outage shouldn't block storing messages.
        console.error('[ratelimit] redis unavailable, allowing', err);
        return false;
    }
}
