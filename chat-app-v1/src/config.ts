import "dotenv/config";

export type Config = {
  env: 'development' | 'test' | 'production';
  port: number;
  instanceId: string;
  redisUrl: string;
  /** host:port seeds of a Redis Cluster. When set, redisUrl is ignored. */
  redisClusterNodes: string[];
  /** Use SPUBLISH/SSUBSCRIBE (Redis 7+). Always on for a cluster. */
  redisSharded: boolean;
  jwtSecret: string;
  jwtTtlSeconds: number;
  /** Allowed `Origin` values for WebSocket upgrades. Empty = don't enforce. */
  allowedOrigins: string[];
  /** Messages per user per window. */
  messageRateLimit: { max: number; windowSeconds: number };
};

// Parse + validate once at startup so a missing secret crashes the boot,
// not the first request. Everything else receives a Config; nothing else reads process.env.
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const nodeEnv = (env.NODE_ENV ?? 'development') as Config['env'];
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be set (>= 16 chars)');
  }
  return {
    env: nodeEnv,
    port: Number(env.PORT ?? 3000),
    instanceId: env.INSTANCE_ID ?? crypto.randomUUID().slice(0, 8),
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    redisClusterNodes: (env.REDIS_CLUSTER_NODES ?? '').split(',').map((n) => n.trim()).filter(Boolean),
    redisSharded: env.REDIS_SHARDED === 'true' || !!env.REDIS_CLUSTER_NODES,
    jwtSecret,
    jwtTtlSeconds: Number(env.JWT_TTL_SECONDS ?? 3600),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    messageRateLimit: {
      max: Number(env.MSG_RATE_MAX ?? 20),
      windowSeconds: Number(env.MSG_RATE_WINDOW_SECONDS ?? 10),
    },
  };
}
