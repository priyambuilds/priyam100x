import { startServer } from './app';
import { loadConfig } from './config';
import { createPrisma } from './lib/prisma';
import { createRedisClients, redisTargetFromConfig } from './lib/redis';
import { RedisBus } from './modules/realtime/redis-bus';

const config = loadConfig();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const prisma = createPrisma(process.env.DATABASE_URL);
const { redis, subscriber } = createRedisClients(redisTargetFromConfig(config));
const bus = new RedisBus(redis, subscriber, { sharded: config.redisSharded });

const instance = startServer({ config, prisma, redis, bus });
console.log(`🦊 [${config.instanceId}] Chat server running at http://${instance.server.hostname}:${instance.server.port}`);
console.log(`   API docs: http://${instance.server.hostname}:${instance.server.port}/openapi`);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Draining...`);

  await instance.stop();
  await bus.close();
  await redis.quit().catch(() => {});
  await prisma.$disconnect();

  console.log('Clean shutdown complete');
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
