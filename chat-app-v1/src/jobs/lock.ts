import type { Redis } from "ioredis";

// Honest, single-Redis lock: SET NX PX to acquire, Lua compare-and-delete to
// release so we never delete a lock someone else now holds. Not safe against
// long GC pauses or Redis failover (that's what fencing tokens are for).
const RELEASE = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

export async function acquireLock(redis: Redis, name: string, ttlMs: number): Promise<string | null> {
    const token = crypto.randomUUID();
    const ok = await redis.set(`lock:${name}`, token, 'PX', ttlMs, 'NX');
    return ok === 'OK' ? token : null;
}

export async function releaseLock(redis: Redis, name: string, token: string) {
    await redis.eval(RELEASE, 1, `lock:${name}`, token);
}

/** Runs `fn` only if this instance wins the lock. Returns whether it ran. */
export async function withLock(redis: Redis, name: string, ttlMs: number, fn: () => Promise<void>) {
    const token = await acquireLock(redis, name, ttlMs);
    if (!token) return false;
    try { await fn(); } finally { await releaseLock(redis, name, token); }
    return true;
}
