# Chat backend (Bun + Elysia + Redis + Postgres)

Horizontally scalable real-time chat: any number of identical instances behind a load balancer.
Postgres is the durable, ordered source of truth; Redis Pub/Sub is the fast cross-instance path.

- API docs (Scalar UI): `GET /openapi` · spec: `GET /openapi/json` · checked-in copy: [openapi.json](openapi.json) (`bun run openapi`)
- WebSocket protocol + the client algorithm: [docs/PROTOCOL.md](docs/PROTOCOL.md)
- Design rationale: [Project 1 Real-time Chat Architecture.md](Project%201%20Real-time%20Chat%20Architecture.md)

## Run

```bash
bun install
cp .env.example .env          # set JWT_SECRET
bun run services:up           # Postgres + Redis (dev: 5432/6379, test: 5433/6380)
bun run db:deploy             # apply migrations
bun run seed                  # alice / bob, password "password123"
bun run dev                   # http://localhost:3000/openapi
PORT=3001 bun run start       # a second instance: messages cross between them
```

## Load balancing and Redis scaling

```bash
bun run lb:up                      # app1 + app2 + nginx (docker); http://localhost:8080
bun scripts/lb-smoke.ts            # sockets spread over both instances; a message crosses between them
bun run lb:down
```

nginx ([docker/nginx.conf](docker/nginx.conf)) uses `least_conn` (connections are long-lived), forwards the `Upgrade`
headers, raises `proxy_read_timeout`, fails over on a dead or draining (503) instance, and needs no sticky sessions.
Point the frontend at it with `VITE_BACKEND_URL=http://localhost:8080`.

**Sharded Pub/Sub.** Classic `PUBLISH` on a Redis Cluster is broadcast to every node, so cluster traffic grows with its size.
With `REDIS_SHARDED=true` (one node) or `REDIS_CLUSTER_NODES=...` (a cluster) the bus uses `SPUBLISH`/`SSUBSCRIBE`:
each room's channel lives on one shard. `bun run services:cluster` starts a local 3-master cluster on 7001-7003.
Cluster-safety rules the code follows: single-key commands or same-slot `MULTI` only, never a cross-slot pipeline.

## Frontend (`client/`)

React 19 + Vite + Tailwind v4, no state library. Dev server proxies the API and the WebSocket to `localhost:3000`, so no CORS setup.

```bash
cd client && bun install && bun run dev    # http://localhost:5173 (backend must be running)
```

`src/lib/chat-client.ts` is the socket (ticket per connect, jittered reconnect, heartbeat).
`src/state/` holds the reducer and the provider that implements the reconnect recipe from [docs/PROTOCOL.md](docs/PROTOCOL.md): subscribe, sync from `lastSeq`, resend pending, dedupe by id.

## Test

```bash
bun run services:up && bun test     # backend; needs the *-test containers
bun run services:cluster            # optional: also runs the Redis Cluster tests (skipped otherwise)
bun run typecheck
```

Tests only ever use `TEST_DATABASE_URL` / `TEST_REDIS_URL` (default: the local docker test services) and refuse non-local hosts.
They run **two app instances in one process** against one Redis and one Postgres.

## Layout

```
src/
  main.ts            wires real Prisma + Redis, signals, graceful shutdown
  app.ts             buildApp(deps) -> Elysia app; startServer() wires the bus to sockets
  config.ts          validated env -> Config (nothing else reads process.env)
  deps.ts            AppDependencies { config, prisma, redis, bus }
  errors.ts          AppError + helpers
  plugins/           auth (JWT macro), error-handler, openapi
  protocol/          TypeBox client events, server event types, close codes
  lib/               prisma / redis factories, DTO mappers
  jobs/              lock-guarded presence sweeper, instance heartbeat, Redis lock
  modules/
    auth/ users/ rooms/   routes.ts (HTTP) + service.ts (logic, no HTTP types)
    messages/             send transaction (seq + idempotency), sync
    gateway/              WS route (thin) + connection registry
    realtime/             MessageBus interface, RedisBus, MemoryBus
    presence/ ratelimit/ metrics/
tests/  unit/ (bus contract, redis services)  http/  ws/  helpers/
```

## Key decisions

- **One delivery path**: Postgres → ack → Redis → every instance (including the sender's) → Bun topics.
- **Seq in the insert transaction**: gapless per room, retries are no-ops (`(senderId, clientMsgId)`).
- **Per-socket event queue**: frames from one socket are processed in order (Bun doesn't await async handlers).
- **Tickets, not tokens, in the URL**; auth happens before the upgrade.
- **Push revocation** over `user:{id}` channels; membership cache is positive-only.
- **Presence** = per-user sorted set of connection heartbeats; transitions only; a lock-guarded sweeper handles crashed instances.
- Bun's WebSocket limits (`maxPayloadLength`, backpressure, idle timeout) are **server-wide** and set on the root Elysia instance.
