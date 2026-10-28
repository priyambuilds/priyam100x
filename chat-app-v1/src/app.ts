import { Elysia } from 'elysia';
import type { AppDependencies } from './deps';
import { errorHandler } from './plugins/error-handler';
import { openapiPlugin } from './plugins/openapi';
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/users/routes';
import { roomRoutes } from './modules/rooms/routes';
import { createGateway, websocketOptions, type GatewayState } from './modules/gateway';
import { Metrics } from './modules/metrics';
import { startJobs } from './jobs';

export type { AppDependencies } from './deps';

// Builds the whole app from injected dependencies and touches no globals, so
// tests can run several instances in one process against one Redis.
export const buildApp = (deps: AppDependencies) => {
  const metrics = new Metrics();
  const state: GatewayState = { draining: false };
  const gateway = createGateway(deps, metrics, state);

  const app = new Elysia({ websocket: websocketOptions })
    .use(errorHandler)
    .use(openapiPlugin())
    .get('/health', () => ({ status: 'ok' }), {
      detail: { tags: ['Ops'], summary: 'Liveness' },
    })
    .get('/ready', ({ status }) => state.draining ? status(503, { status: 'draining' }) : { status: 'ready' }, {
      detail: { tags: ['Ops'], summary: 'Readiness: fails during shutdown so the load balancer stops routing here' },
    })
    .get('/metrics', () => ({
      instanceId: deps.config.instanceId,
      connections: gateway.registry.size,
      subscribedTopics: deps.bus.topicCount,
      ...metrics.counters,
    }), {
      detail: { tags: ['Ops'], summary: 'Per-instance counters and gauges' },
    })
    .use(authRoutes(deps))
    .use(userRoutes(deps))
    .use(roomRoutes(deps))
    .use(gateway.plugin);

  return { app, gateway, metrics, state };
};

// The type Eden Treaty clients import.
export type App = ReturnType<typeof buildApp>['app'];

/**
 * Listens, then wires the bus to local sockets:
 *   room:*  -> Bun native topic fan-out (one publish, N sockets)
 *   user:*  -> gateway (targeted: revocations, "you were added")
 * and starts background jobs + the token-expiry sweep.
 */
export function startServer(deps: AppDependencies, port = deps.config.port) {
  const { app, gateway, metrics, state } = buildApp(deps);
  app.listen(port);
  const server = app.server!;

  const off = deps.bus.onEvent((topic, event) => {
    if (topic.startsWith('room:')) {
      const { v: _v, ...payload } = event;
      server.publish(topic, JSON.stringify(payload));
      metrics.inc('messagesDelivered');
    } else {
      gateway.handleUserEvent(topic, event);
    }
  });
  const jobs = startJobs({ ...deps, instanceId: deps.config.instanceId });
  const expiry = setInterval(() => gateway.closeExpired(), 15_000);

  return {
    app, server, gateway, jobs,
    async stop() {
      state.draining = true;          // /ready -> 503, new upgrades -> 503
      clearInterval(expiry);
      await jobs.stop();
      gateway.closeAll();             // 1012: clients reconnect to another instance
      await Bun.sleep(100);           // let close frames flush
      off();
      await server.stop(true);
    },
  };
}
