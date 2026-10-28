import type { Redis } from "ioredis";
import type { PrismaClient } from "../../generated/prisma/client";
import type { MessageBus } from "../modules/realtime/bus";
import { withLock } from "./lock";
import * as presence from "../modules/presence/service";

type JobDeps = { prisma: PrismaClient; redis: Redis; bus: MessageBus; instanceId: string };

// Background work every instance runs. The sweeper is lock-guarded so only one
// instance does it per tick; the heartbeat is how instances see each other.
export function startJobs(deps: JobDeps, opts = { sweepMs: 30_000, heartbeatMs: 10_000 }) {
    const beat = () => deps.redis.set(`instance:${deps.instanceId}`, '1', 'EX', 30).catch(() => {});
    const sweep = () => withLock(deps.redis, 'presence-sweeper', opts.sweepMs - 1000, async () => {
        for (const userId of await presence.findExpired(deps.redis)) {
            await presence.announce(deps, userId, false);
        }
    }).catch((err) => console.error('[jobs] presence sweep failed', err));

    void beat();
    const timers = [setInterval(beat, opts.heartbeatMs), setInterval(sweep, opts.sweepMs)];
    return {
        sweep,
        stop: async () => {
            timers.forEach(clearInterval);
            await deps.redis.del(`instance:${deps.instanceId}`).catch(() => {});
        },
    };
}
