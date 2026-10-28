import { Cluster, Redis } from "ioredis";

/** A redis:// URL, or the seed nodes ("host:port") of a Redis Cluster. */
export type RedisTarget = string | { clusterNodes: string[] };

// A connection in subscribe mode can only (un)subscribe, so every instance
// needs two: one for normal commands + publish, one dedicated to subscribing.
//
// Cluster mode returns a `Cluster`, cast to `Redis`: it exposes the same command
// API, and the services only use single-key commands or same-slot MULTIs.
export function createRedisClients(target: RedisTarget) {
  const make = (): Redis => {
    if (typeof target === "string") return new Redis(target);
    return new Cluster(
      target.clusterNodes.map((n) => { const [host, port] = n.split(":"); return { host: host!, port: Number(port) }; }),
      // One extra subscriber connection per master, so SSUBSCRIBE reaches the shard that owns the channel.
      { shardedSubscribers: true },
    ) as unknown as Redis;
  };

  const redis = make();
  const subscriber = make();
  for (const client of [redis, subscriber]) {
    client.on("error", (err: Error) => console.error("[redis]", err.message));
  }
  return { redis, subscriber };
}

/** Pick the target from validated config (cluster nodes win over the URL). */
export const redisTargetFromConfig = (c: { redisUrl: string; redisClusterNodes: string[] }): RedisTarget =>
  c.redisClusterNodes.length > 0 ? { clusterNodes: c.redisClusterNodes } : c.redisUrl;

export type { Redis };
