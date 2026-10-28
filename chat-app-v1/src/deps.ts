import type { Redis } from 'ioredis';
import type { PrismaClient } from '../generated/prisma/client';
import type { Config } from './config';
import type { MessageBus } from './modules/realtime/bus';

/** Everything the app needs from the outside world. Tests build their own. */
export type AppDependencies = {
  config: Config;
  prisma: PrismaClient;
  redis: Redis;
  bus: MessageBus;
};

/** Shared by services that publish events or touch the cache. */
export type ServiceDeps = Pick<AppDependencies, 'prisma' | 'redis' | 'bus'>;
