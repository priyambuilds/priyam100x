import type { Redis } from 'ioredis';
import type { PrismaClient } from '../../../generated/prisma/client';

const MEMBERS_TTL_SECONDS = 600;
const key = (roomId: string) => `room:members:${roomId}`;

// Cache-aside, positives only: a cache hit is trusted, a miss always falls
// back to Postgres. So a newly added member works immediately; removals call
// invalidateMembership().
export async function isMember(
    deps: { prisma: PrismaClient; redis: Redis },
    userId: string,
    roomId: string,
): Promise<boolean> {
    try {
        if (await deps.redis.sismember(key(roomId), userId)) return true;
    } catch (err) {
        console.error('[membership] cache read failed, using Postgres', err);
    }

    const row = await deps.prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
        select: { userId: true },
    });
    if (!row) return false;

    deps.redis.multi().sadd(key(roomId), userId).expire(key(roomId), MEMBERS_TTL_SECONDS).exec()
        .catch((err) => console.error('[membership] cache write failed', err));
    return true;
}

export async function invalidateMembership(redis: Redis, roomId: string) {
    await redis.del(key(roomId));
}
