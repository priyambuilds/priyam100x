import type { Redis } from "ioredis";
import type { PrismaClient } from "../../../generated/prisma/client";
import { roomTopic, type MessageBus } from "../realtime/bus";

const STALE_AFTER_MS = 60_000;
const ONLINE_SET = 'presence:online';
const key = (userId: string) => `presence:user:${userId}`;

// One sorted set per user: member = connectionId, score = last heartbeat ms.
// "Online" = any connection heartbeated within STALE_AFTER_MS. Several tabs work,
// and a crashed instance's connections age out without any close event.
const trim = (redis: Redis, userId: string) =>
    redis.zremrangebyscore(key(userId), '-inf', Date.now() - STALE_AFTER_MS);

/** Record a heartbeat. Returns true if this took the user from offline to online. */
export async function touch(redis: Redis, userId: string, connectionId: string): Promise<boolean> {
    await trim(redis, userId);
    const wasOnline = (await redis.zcard(key(userId))) > 0;
    // Two keys on two slots, so no MULTI: on a Redis Cluster that would be CROSSSLOT.
    await redis.multi().zadd(key(userId), Date.now(), connectionId).expire(key(userId), 120).exec();
    await redis.sadd(ONLINE_SET, userId);
    return !wasOnline;
}

/** Remove a connection. Returns true if that was the user's last one. */
export async function leave(redis: Redis, userId: string, connectionId: string): Promise<boolean> {
    await redis.zrem(key(userId), connectionId);
    await trim(redis, userId);
    if ((await redis.zcard(key(userId))) > 0) return false;
    await redis.srem(ONLINE_SET, userId);
    return true;
}

/** Users whose every connection went stale (e.g. their instance crashed). */
export async function findExpired(redis: Redis): Promise<string[]> {
    const gone: string[] = [];
    for (const userId of await redis.smembers(ONLINE_SET)) {
        await trim(redis, userId);
        if ((await redis.zcard(key(userId))) === 0) {
            await redis.srem(ONLINE_SET, userId);
            gone.push(userId);
        }
    }
    return gone;
}

export async function onlineAmong(redis: Redis, userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const cutoff = Date.now() - STALE_AFTER_MS;
    // Parallel single-key commands (a cross-slot pipeline isn't allowed on a cluster).
    const counts = await Promise.all(userIds.map((id) => redis.zcount(key(id), cutoff, '+inf')));
    return new Set(userIds.filter((_, i) => counts[i]! > 0));
}

/** Tell every room the user is in. Only called on online/offline transitions. */
export async function announce(
    deps: { prisma: PrismaClient; bus: MessageBus },
    userId: string,
    online: boolean,
) {
    const rooms = await deps.prisma.roomMember.findMany({ where: { userId }, select: { roomId: true } });
    await Promise.all(rooms.map((r) =>
        deps.bus.publish(roomTopic(r.roomId), { type: 'presence.update', userId, online })
            .catch((err) => console.error('[presence] publish failed', err))));
}
