# Rebuild Guide: Real-time Chat (Bun + Elysia + Redis + Postgres)

This guide has three jobs:

1. **Explain what exists** (architecture, every module, every Redis key, the protocol).
2. **Explain why** it is shaped this way, including the bugs that shaped it.
3. **Give you a phase-by-phase plan** to rebuild it by hand so that you understand it, not just reproduce it.

Read Parts 1–3 once, then put this repo aside and follow Part 5 phase by phase.

---

## Part 0: Before you start

**Is this ready to be rebuilt from? Yes.** The backend type-checks, ~95 backend tests pass (88 + 9 that need the optional Redis Cluster container), the nginx setup and the Redis Cluster mode were run for real, and the frontend was exercised in a browser.

**Do this first:**

1. **Commit the current state** (nothing is committed yet) and tag it, so you always have an untouched reference:
   ```bash
   git add -A && git commit -m "Reference implementation" && git tag reference
   ```
   (`.env` is git-ignored. Check `git status` before committing.)
2. **Rebuild in a new empty directory** (or a new branch with `src/` and `tests/` emptied). Never edit the reference.
3. Keep services running while you work: `bun run services:up` (dev Postgres :5432, Redis :6379, and disposable test Postgres :5433, Redis :6380).

**How to use the reference while learning (the "peek policy"):**

- Try each phase yourself first. Only open the reference files listed under **Compare with** *after* your tests pass.
- When stuck for 30+ minutes, read **one** reference function, close it, and write your own version from memory.
- Never copy-paste. Typing it forces you to notice every line.
- The tests in `tests/` are a precise specification. Reading a test before you implement the feature is allowed and encouraged. It is the one thing you *should* peek at.

---

## Part 1: What the app is

A **chat backend** where many identical server instances behave like one server:

- Group rooms and 1:1 direct messages (a DM is just a room with exactly two members).
- Real-time send/receive over **one WebSocket per client**.
- **Durable history** in Postgres with a per-room sequence number (`seq`) that gives a total order.
- Reliability: delivery acks, retry-safe sends, gap recovery after disconnects, read receipts.
- Presence (online/offline) and typing indicators.
- Per-user rate limiting.
- Operations: graceful shutdown, metrics, a lock-guarded background job, nginx load balancing, Redis Cluster support.
- A React frontend (`client/`) that implements the reconnect protocol.

**The one fact the whole design follows from:** a WebSocket is a live object in *one process's memory*. Instance A cannot write to a socket owned by instance B. So you need (a) a way to broadcast between instances (Redis Pub/Sub) and (b) a source of truth that survives anything (Postgres), because Pub/Sub is fire-and-forget and loses messages.

---

## Part 2: Architecture

### 2.1 The big picture

```
                         ┌───────────────┐
 Browser ──HTTP/WS────►  │  nginx (LB)   │  least_conn, Upgrade headers, failover
                         └───┬───────┬───┘
                             │       │
                   ┌─────────▼─┐   ┌─▼─────────┐
                   │ Instance A │   │ Instance B │   identical Elysia apps
                   │ HTTP API   │   │ HTTP API   │   (HTTP routes + WS gateway)
                   │ WS gateway │   │ WS gateway │
                   │ local fan- │   │ local fan- │   Bun native topics deliver to
                   │ out (Bun)  │   │ out (Bun)  │   sockets inside one process
                   └──┬──────┬──┘   └──┬──────┬──┘
                      │      │         │      │
              ┌───────▼──────▼─────────▼──────▼───────┐
              │ Redis                                  │
              │  • Pub/Sub  = cross-instance broadcast │
              │  • tickets, presence, rate limits,     │
              │    membership cache, locks             │
              └────────────────────────────────────────┘
              ┌────────────────────────────────────────┐
              │ Postgres (Prisma) = source of truth    │
              │  users, rooms, members, messages, seq  │
              └────────────────────────────────────────┘
```

Instances share **nothing in memory**. They coordinate only through Redis and Postgres. Any instance can serve any client; if one dies, clients reconnect to another and resync from Postgres.

### 2.2 The two paths: fast and safe

| Path | Technology | Guarantee | Role |
| --- | --- | --- | --- |
| Fast path | Redis Pub/Sub → Bun topics | at-most-once, may lose messages | Low-latency live delivery |
| Safe path | Postgres + `seq` + `sync` | durable, ordered | Source of truth, recovery |

Because the fast path can lose messages, **a message is persisted before it is published**, and the client can always recover with `sync { afterSeq }`. The user experience is "exactly once on screen" because delivery is at-least-once (live + sync overlap) and the client **dedupes by message id**.

### 2.3 Life of a message (memorize this)

Alice (instance A) sends "hi" to room R; Bob (instance B) is in R.

1. Client sends `{type:'message.send', roomId, clientMsgId:<uuid>, body}` and shows the message as *pending*.
2. **Validate**: Elysia's TypeBox schema rejects bad frames before your handler runs.
3. **Authorize**: is Alice a member of R? (Redis set cache, falling back to Postgres.)
4. **Rate limit**: Redis fixed-window counter. Over the limit → an `error` *event* (the socket stays open).
5. **Persist in one transaction**: `UPDATE Room SET lastSeq = lastSeq + 1` (this row lock serialises writers of R), then `INSERT Message(seq = lastSeq)`. Unique `(senderId, clientMsgId)` makes retries a no-op.
6. **Ack** Alice: `{type:'message.ack', clientMsgId, id, seq, createdAt}`, meaning "stored with seq N".
7. **Publish** `message.new` to Redis topic `room:R`.
8. **Every instance subscribed to `room:R`** (A and B, including the sender's own) receives it and calls Bun's `server.publish('room:R', json)`.
9. **Bun fans out** to every local socket subscribed to topic `room:R`.
10. **Client** dedupes by `id`, tracks `lastSeq` per room; a jump in `seq` means a gap → `sync`.

Why this order:

- *Persist before publish*: if publish fails the message is still safe and recoverable. The reverse could show a message that then vanishes.
- *Ack after persist, not after publish*: the ack means "durable with seq N", the guarantee the sender cares about.
- *One delivery path*: the sender's instance never delivers directly. Everything goes DB → Redis → every instance. One path means no "duplicate locally / missing remotely" bugs, at the cost of one Redis round trip.

### 2.4 Connecting a WebSocket (auth)

Browsers cannot set an `Authorization` header on a WebSocket, and putting a JWT in the URL leaks it into logs. So:

1. `POST /auth/login` → JWT (default 1 h).
2. `POST /ws/ticket` (Bearer JWT) → random 32-byte one-time **ticket**, stored in Redis `ws:ticket:{t}` = `{userId, exp}` with a 30 s TTL.
3. `GET /ws?ticket=…`. Before the HTTP→WS upgrade, a `.resolve()` hook: returns 503 if draining, 403 if `Origin` isn't allowed, then does `GETDEL ws:ticket:{t}` (atomic read-and-delete, so a ticket can win only once) and returns 401 if missing. **A bad ticket never gets a socket.**
4. `open`: register the connection, subscribe to the user's private topic `user:{id}`, record presence, send `connected`.

The JWT's `exp` is stored with the connection; a timer closes sockets with code **4001** when it passes.

### 2.5 Reconnect and gap recovery (client algorithm)

1. Backoff with **full jitter**: `random(0, min(30 s, 500 ms × 2^attempt))`. Without jitter a restarted server gets every client at the same instant.
2. New ticket → connect → `room.subscribe` for each open room.
3. On `room.subscribed` → `sync { afterSeq: lastSeq }` until `hasMore` is false. **Subscribe before sync** so nothing published during the sync is lost; dedupe absorbs the overlap.
4. Re-send still-pending messages with their **original** `clientMsgId` (server-side idempotency makes this safe).

### 2.6 Targeted events: the `user:{id}` topic

Room topics carry room traffic. A per-user topic carries things aimed at one person across instances:

- `room.removed`: you were kicked or left. Every instance holding that user's sockets unsubscribes them from the room (Bun topic **and** the bus ref-count) and forwards the event. Combined with the membership-cache invalidation, a removed member stops receiving immediately everywhere.
- `room.added`: you were added; the client should subscribe.

### 2.7 Ref-counted subscriptions (the bit people get wrong)

Each instance subscribes to Redis topic `room:R` **only while it has ≥1 local socket in R**.

- socket joins, count 0→1 ⇒ `SUBSCRIBE`
- socket leaves/disconnects, count 1→0 ⇒ `UNSUBSCRIBE`
- Unsubscribing on *every* leave would cut off other local sockets. Never unsubscribing leaks channels forever. A socket that subscribes to the same room twice must not be counted twice (the gateway dedupes per socket).

Why per-room topics and not one global channel? With one global channel every instance would receive every message of every room and discard most of it, so per-instance cost would grow with total system traffic instead of its own users.

### 2.8 Presence

- Redis sorted set per user: `presence:user:{id}`, member = **connectionId**, score = last heartbeat (ms).
- Online = any member within the last 60 s. Multiple tabs work; a crashed instance's connections simply age out (a crash fires no `close` event).
- **Transitions only**: `presence.update` is published (to each room the user is in) only on *first connect* and *last disconnect*, never per heartbeat.
- A **lock-guarded sweeper** (every 30 s, one instance wins `lock:presence-sweeper`) finds users whose every connection went stale (`presence:online` set) and announces them offline.

### 2.9 Graceful shutdown

`SIGTERM`/`SIGINT` → mark *draining* (`/ready` returns 503, new upgrades 503) → stop jobs → close every socket with **1012** ("restart, reconnect elsewhere") → short flush delay → stop the server → close Redis → disconnect Prisma. nginx sees the 503/failed upstream and routes to the other instance.

---

## Part 3: Everything that was implemented

### 3.1 Backend file map

```
src/
  main.ts                 Wires real Prisma + Redis, starts the server, handles signals
  app.ts                  buildApp(deps) → Elysia app; startServer() wires bus → sockets
  config.ts               Validated env → Config (the ONLY place reading process.env)
  deps.ts                 AppDependencies = { config, prisma, redis, bus }
  errors.ts               AppError(status, code, message) + helpers
  plugins/
    auth.ts               JWT + `auth: true` macro → handler gets { userId, tokenExp }
    error-handler.ts      One global mapper → { error: { code, message } }
    openapi.ts            Scalar docs at /openapi, spec at /openapi/json
  protocol/
    client-events.ts      TypeBox schemas for frames the client sends
    server-events.ts      TS types for frames the server sends + close codes
  lib/
    prisma.ts / redis.ts  Client factories (Redis: standalone OR cluster)
    dto.ts                Row → client-facing shape (never leak raw rows)
  modules/
    auth/                 routes (register/login/me/ws-ticket), service (argon2id), ticket
    users/                search + presence lookup
    rooms/                routes, service (groups, DMs, roles, history, read), membership cache
    messages/service.ts   saveMessage (transaction + idempotency), syncMessages
    gateway/index.ts      The WS route: thin handlers → services. Plus per-socket queue
    gateway/registry.ts   In-memory map of local connections
    realtime/             MessageBus interface, RedisBus, MemoryBus
    presence/service.ts   Heartbeat sorted sets, transitions, sweeper query
    ratelimit/            Fixed-window counter (INCR+EXPIRE in one MULTI)
    metrics/              Per-instance counters
  jobs/                   lock.ts (SET NX PX + Lua release), index.ts (sweeper + liveness key)
prisma/schema.prisma + migrations/
docker-compose.yml, Dockerfile, docker/nginx.conf, docker/redis-cluster.sh
scripts/gen-openapi.ts, scripts/lb-smoke.ts
tests/                    (see 3.7)
client/                   React + Vite + Tailwind
```

### 3.2 Layering rules (the "best practice" skeleton)

- **`createApp`/`buildApp(deps)` takes all dependencies as arguments** and touches no globals. That is what lets tests boot two instances in one process, each with its own Redis connections.
- **Routes/handlers are thin**: decode → authorize → call a **service** → map the result. Services know nothing about HTTP or sockets, so they are unit-testable.
- **Errors are values with codes.** Services throw `AppError(403,'FORBIDDEN',…)`. HTTP maps it to a status; the gateway maps the same code to an `error` event.
- **Config is validated once at boot.** A missing `JWT_SECRET` crashes startup, not the first request.
- **Interfaces at the seams**: `MessageBus` has Redis and in-memory implementations behind one contract.

### 3.3 Data model

```
User(id, username unique, passwordHash, createdAt)
Room(id, kind DIRECT|GROUP, name?, dmKey? unique, lastSeq, createdAt)
RoomMember(roomId, userId, role OWNER|ADMIN|MEMBER, lastReadSeq, joinedAt)   PK(roomId,userId), index(userId)
Message(id, roomId, seq, senderId, clientMsgId uuid, body, createdAt)
   unique(roomId, seq)              ← ordering + keyset-pagination index
   unique(senderId, clientMsgId)    ← idempotent retries
```

Decisions worth being able to defend:

| Question | Answer |
| --- | --- |
| Why a `Room.lastSeq` counter, not `createdAt` / auto-increment id / Redis `INCR`? | Clocks skew across instances; a global id has per-room gaps (so clients can't detect missed messages); Redis `INCR` leaves permanent gaps if the DB insert then fails. A counter bumped **inside the insert transaction** is gapless and total; a failed insert rolls the bump back. |
| What does the counter cost? | The `UPDATE` takes a row lock, so sends to one room serialise. Correct and cheap for chat; the Project-3 answer for a hot room is a single-writer per room. |
| Why `dmKey` = sorted `"userA:userB"` unique? | Two concurrent "start DM" calls can only create one room (the loser hits the unique constraint and re-reads). |
| Why keyset pagination (`WHERE seq < ? ORDER BY seq DESC LIMIT n`)? | Served from the `(roomId, seq)` index, constant cost at any depth, and new messages don't shift pages (OFFSET does both badly). |
| Unread counts? | `room.lastSeq − member.lastReadSeq`. Read receipts only move forward: `UPDATE … WHERE lastReadSeq < :seq`, clamped to `lastSeq`. |
| Why cascade deletes? | Deleting a user/room cleans dependents; tests rely on this for cleanup. |

### 3.4 HTTP API (see `/openapi` for the live spec)

| Route | Purpose |
| --- | --- |
| `POST /auth/register`, `/auth/login` | Account + bearer JWT. Login is rate-limited per IP+username; wrong password and unknown user are indistinguishable (dummy hash for equal timing). Passwords: argon2id via `Bun.password`. |
| `GET /me` | Current user |
| `POST /ws/ticket` | JWT → one-time WS ticket |
| `GET /users?q=` · `GET /users/:id/presence` | Search; online? |
| `GET /rooms` | My rooms with unread count, last message, DM peer name |
| `POST /rooms` · `POST /rooms/dm` | Create group (creator = OWNER) · start/fetch DM (idempotent, race-safe) |
| `GET /rooms/:id` | Room, members, roles, presence |
| `GET /rooms/:id/messages?before=&limit=` | Keyset history, newest first, exact `hasMore` |
| `POST /rooms/:id/members` · `DELETE /rooms/:id/members/:userId` | Add (OWNER/ADMIN) · leave or remove. Owner leaving promotes the longest-standing member; empty rooms are deleted. |
| `POST /rooms/:id/read` | Advance read receipt |
| `GET /health` · `/ready` · `/metrics` | Liveness · readiness (503 while draining) · counters |

### 3.5 WebSocket protocol

Client → server (`type`): `room.subscribe`, `room.unsubscribe`, `message.send`, `sync`, `typing`, `read`, `heartbeat`.
Server → client: `connected`, `room.subscribed`, `message.ack`, `message.new`, `sync.result`, `typing`, `read.update`, `presence.update`, `room.added`, `room.removed`, `error`.

Conventions:

- Frames are JSON objects **discriminated by `type`**, defined once as TypeBox unions.
- **Errors are events, not disconnects.** Close the socket only for auth expiry (4001), repeated abuse (4008), oversize (1009), restart (1012).
- **Close codes are part of the API**: clients branch on them to decide whether to reconnect.
- Bus payloads carry **`v: 1`**, so a rolling deploy with two code versions can ignore incompatible messages.
- The full table is in `docs/PROTOCOL.md`.

### 3.6 Redis, as a toolbox

| Key / channel | Type | TTL | Purpose | Concept |
| --- | --- | --- | --- | --- |
| `room:{id}`, `user:{id}` (channels) | Pub/Sub | n/a | Cross-instance broadcast | Fire-and-forget, ref counting |
| `ws:ticket:{t}` | string | 30 s | One-time WS auth | `SET EX`, atomic `GETDEL` |
| `room:members:{roomId}` | set | 10 min | Membership cache (positives only) | Cache-aside + invalidation on removal |
| `rl:msg:{user}:{window}` | counter | window | Messages/user/window | `INCR`+`EXPIRE` in one `MULTI` |
| `rl:login:{ip}:{user}:{window}` | counter | 60 s | Brute-force guard | same |
| `presence:user:{id}` | sorted set | 120 s | Per-connection heartbeats | Range queries, crash-safe expiry |
| `presence:online` | set | n/a | Users to sweep | Cheap candidate list |
| `lock:{name}` | string | ms | Only one instance runs the sweeper | `SET NX PX` + Lua compare-and-delete |
| `instance:{id}` | string | 30 s | Liveness heartbeat (written; nothing reads it yet) | Heartbeat via TTL |

Notes:

- **Subscriber connections are special**: a connection in subscribe mode can only (un)subscribe. Each instance therefore has **two** Redis clients: one for commands + `PUBLISH`, one dedicated subscriber.
- **The membership cache is positive-only**: a hit is trusted; a miss always checks Postgres. So newly added members work immediately; only *removals* must invalidate.
- **The lock is honest about its limits.** It is safe for "run this job on one instance"; it is not safe against long GC pauses or failover (that needs fencing tokens, which Project 3 revisits).
- **Cluster-safe rules**: use single-key commands or `MULTI` over keys in one slot; no cross-slot pipelines. (`touch` presence therefore doesn't `MULTI` across `presence:user:*` and `presence:online`.)

### 3.7 Scaling features

- **nginx** (`docker/nginx.conf`): `least_conn` (connections are long-lived, so round-robin leaves older instances overloaded after a deploy), forwards `Upgrade`/`Connection`, `proxy_read_timeout 3600s`, `proxy_connect_timeout 2s`, retries on `http_503`. **No sticky sessions needed**: after the upgrade a socket is pinned to its instance anyway, and HTTP is stateless.
- **Sharded Pub/Sub** (`REDIS_SHARDED=true` / `REDIS_CLUSTER_NODES=…`): classic `PUBLISH` on a cluster is broadcast to *every node*, so cost grows with cluster size. `SPUBLISH/SSUBSCRIBE` keep a channel on one shard. ioredis needs `shardedSubscribers: true` for the cluster subscriber.
- **Per-socket event queue** (see 4.3) and **server-wide Bun limits**: `idleTimeout`, `maxPayloadLength` (16 KiB), `backpressureLimit` (1 MiB) + `closeOnBackpressureLimit`.

### 3.8 Frontend (`client/`)

React 19 + Vite + Tailwind v4, no state library.

- `lib/chat-client.ts`: the socket. Fresh ticket per connect, jittered backoff, 25 s heartbeat, `4001` → logout.
- `state/reducer.ts`: pure reducer. `mergeMessages` dedupes by id and sorts by seq; pending messages are tracked by `clientMsgId`; the ack turns pending into confirmed; the later broadcast dedupes onto it.
- `state/ChatProvider.tsx`: implements the reconnect recipe (subscribe → sync → resend pending), gap detection, read marking, optimistic sending, and typing throttling.
- `components/`: Auth, Sidebar, ChatPane, NewChatModal.
- Dev proxy in `vite.config.ts` forwards `/auth /me /users /rooms /ws` (incl. WebSocket upgrade) to the backend, so no CORS.
- `uuid()` avoids `crypto.randomUUID()`, which only exists in secure contexts (breaks on `http://192.168…`).

### 3.9 Testing strategy (backend)

| Layer | Files | What it proves |
| --- | --- | --- |
| Contract | `unit/bus.contract.test.ts` | One suite for `MemoryBus`, `RedisBus`, sharded, and cluster: delivery, ref counting, no leaks, bad payloads ignored |
| Redis services | `unit/redis-services.test.ts` | Tickets single-use (incl. atomic race), rate limit has a TTL, lock mutual exclusion, presence transitions |
| HTTP | `http/*.test.ts` | Auth, roles, DM race, keyset pages, read clamp, OpenAPI contents, config validation |
| WebSocket integration | `ws/gateway.test.ts` | Two instances + one Redis + one Postgres: cross-instance delivery, ticket reuse/race, Origin, token expiry, revocation on every instance, idempotent/racing retries, **50 concurrent senders get seq 1..50**, sync paging, gap recovery, validation, oversize frames, rate limiting, presence incl. crash sweeper, graceful drain, metrics |
| Cluster | `ws/cluster.test.ts` | The whole stack on a real Redis Cluster (skipped if it isn't running) |

Practices: real Postgres/Redis (mocks would have hidden the seq and CROSSSLOT bugs); two app instances in one process; `nextEvent`-style helpers instead of sleeping; unique ids and a unique bus prefix per test file; a guard that refuses non-local databases; every behaviour covered on happy, sad, conflict, and validation paths.

---

## Part 4: Lessons: the bugs this project taught (try to hit them yourself)

Each of these cost real debugging time. If you rebuild in the order of Part 5 you will meet most of them naturally. Resist reading this list as a spoiler sheet until after the relevant phase.

1. **Seq bump outside a transaction** leaves permanent gaps when the insert fails (and a retry bumps again). Fix: one `$transaction`; fast-path existing `clientMsgId`.
2. **Auth in `open()`** means the socket already exists before the ticket is checked, and messages can arrive before the async check finishes. Fix: authenticate **before the upgrade**.
3. **Per-route WebSocket options are silently ignored.** In Bun, `maxPayloadLength`, `idleTimeout`, backpressure are *server-wide* (`new Elysia({ websocket })`). A typo'd option (`closeOnBackPressureLimit`) is also silently ignored. **Prove limits with a test** (the 1009/oversize test).
4. **A message handler's return value is sent to the client.** `return ws.send(...)` sent a stray frame. Handlers must return nothing.
5. **Async handlers aren't awaited between frames.** Two quick sends from one socket raced, and seq order ≠ send order. Fix: a per-socket promise chain (queue).
6. **Ref-count leaks**: subscribing twice counted twice, but the socket's set stored it once, so the channel stayed subscribed forever.
7. **Non-atomic `INCR` then `EXPIRE`** can leave a counter with no TTL: a permanent lockout. Fix: one `MULTI`.
8. **Cross-slot commands** (`MULTI`/pipeline over different keys) fail on Redis Cluster with `CROSSSLOT`. And the cluster subscriber needs `shardedSubscribers: true` or you get `MOVED` errors.
9. **`connected` sent before presence recorded**, so "connected" didn't mean "online". Order of side effects matters.
10. **The old test called `flushall` on a hosted Redis.** Tests that write must be physically unable to reach real data.
11. **`crypto.randomUUID()` needs a secure context**: it works on `localhost`, breaks on a LAN IP over HTTP.
12. **Flaky tests are signal.** Two "flaky" failures were real bugs (#5, #9) and one was a test racing its own backoff window.

---

## Part 5: The rebuild plan

### How each phase works (follow this loop every time)

1. **Read** the phase goal and concepts.
2. **Predict**: write down (literally, in a notes file) your answers to the *Predict* questions before touching code.
3. **Write failing tests first** (use the *Test list* as the spec; reading the reference test of the same name is allowed).
4. **Implement the smallest thing** that passes. Do not build ahead.
5. **Experiment**: do the *Break it on purpose* items. Seeing the failure is what makes the fix stick.
6. **Compare** with the reference files. Write down 3 differences and which you prefer, and why.
7. **Explain it out loud** (rubber duck, or write a paragraph). If you can't, redo the step.

Suggested pacing: ~1 phase per sitting; phases 5, 7 and 9 are the richest.

---

### Phase 0: Foundations

**Goal:** a skeleton where everything is injected and testable.

**Concepts:** Bun workspace, Prisma 7 with the pg adapter, Docker Compose, config validation, dependency injection via a factory.

**Build:**
- `docker-compose.yml` (Postgres + Redis, plus a *separate disposable test pair*).
- Prisma schema with just `User`, `Room`, `RoomMember`, `Message` (strings are fine now; you'll add enums later).
- `config.ts` that throws on a missing secret; `createApp(deps)` returning an Elysia app with `/health`.
- `tests/setup.ts` that **refuses non-local DB hosts** and migrates the test DB.

**Predict:** Why must `createApp` not import a global `prisma`? What would two instances in one test process share if it did?

**Test list:** `/health` works; config rejects a short secret; the test setup refuses a remote URL.

**Done when:** `bun test` boots the app on port `0` against the test containers.
**Compare with:** `src/app.ts`, `src/config.ts`, `src/deps.ts`, `tests/setup.ts`, `docker-compose.yml`.

---

### Phase 1: Auth and the HTTP skeleton

**Goal:** register/login with JWT, one global error format, OpenAPI.

**Concepts:** argon2id (`Bun.password`), JWT `sub`/`exp`, Elysia macros/`resolve`, a global `onError`, timing-safe login.

**Build:** `AppError`; error handler → `{error:{code,message}}`; `auth: true` macro; register/login/`/me`; OpenAPI plugin.

**Predict:** Why compare against a dummy hash when the user doesn't exist? What does an attacker learn if you don't?

**Test list:** register→login→`/me`; duplicate username → 409; wrong password and unknown user return **identical** bodies; invalid inputs → 400 `VALIDATION`; protected routes 401 without a token; unknown route → JSON 404.

**Break it on purpose:** return different messages for "no such user" vs "wrong password" and write the test that catches it.
**Compare with:** `plugins/*`, `modules/auth/*`, `errors.ts`, `tests/http/auth.test.ts`.

---

### Phase 2: Rooms over HTTP

**Goal:** groups, DMs, membership, history, read receipts, with **no WebSocket yet**.

**Concepts:** unique constraints as concurrency control, roles, keyset pagination, forward-only updates.

**Build:** create group; `getOrCreateDm` with `dmKey`; list/get room; add/remove member (owner succession); history; mark-read.

**Predict:** Two users start a DM with each other at the same instant. Walk through exactly what Postgres does. What must your code do on the unique-violation?

**Test list:** concurrent "start DM" ×4 → exactly one room; only OWNER/ADMIN can add; member can leave, owner can kick, member can't; owner leaves → heir; history pages are `[7,6,5]`,`[4,3,2]`,`[1]` with exact `hasMore`; read can't go backwards and is clamped to `lastSeq`; non-members get 403 everywhere.

**Break it on purpose:** implement history with `OFFSET`, insert rows while paging, and observe duplicated/skipped rows.
**Compare with:** `modules/rooms/*`, `tests/http/rooms.test.ts`.

---

### Phase 3: Single-instance WebSocket

**Goal:** two clients on **one** instance chat in real time. In-memory only.

**Concepts:** the WS lifecycle (upgrade/open/message/close/ping), why a socket is process-local state, TypeBox discriminated unions, Bun native pub/sub topics, one-time tickets, authenticating **before** upgrade.

**Build:** `protocol/` schemas; `POST /ws/ticket` (Redis `SET EX`); `.resolve()` hook that does `GETDEL` and 401s; `.ws('/ws')` with `room.subscribe` + a *temporary* local `server.publish`.

**Predict:** With a ticket, why is it safe to put it in a URL but not the JWT? What if two sockets use the same ticket in the same millisecond?

**Test list:** connects with a ticket; missing/bogus/reused tickets fail the upgrade; **two sockets racing for one ticket → exactly one wins**; non-members can't subscribe; invalid frames don't drop the socket.

**Break it on purpose:** do auth inside `open()` instead and find the window where a message can sneak in. Then `return ws.send(...)` from a handler and watch the stray frame arrive.
**Compare with:** `protocol/*`, `modules/auth/ticket.ts`, `modules/gateway/index.ts` (the `.resolve` and `open`).

---

### Phase 4: Durable, ordered, idempotent messages

**Goal:** messages stored with a gapless `seq`; retries are harmless; clients can `sync`.

**Concepts:** transactions, row locks, `P2002`, idempotency keys, ack semantics, hasMore via `limit+1`.

**Build:** `saveMessage` (fast-path lookup → `$transaction{ bump lastSeq; insert }` → catch unique violation and re-read); `message.ack`; `sync`.

**Predict:** What happens to `lastSeq` if the insert fails? If you bumped Redis `INCR` instead, what then? Why is the ack sent *after* the DB commit?

**Test list:** same `clientMsgId` twice → one row, **same** ack; a retry *racing* the original doesn't burn a seq; **50 concurrent senders get exactly seq 1..50**; sync returns exactly the missed messages with exact `hasMore` (try 120 messages: pages of 100 and 20).

**Break it on purpose:** remove the transaction and write a test that finds the gap. Then write the 50-concurrent test against the broken version.
**Compare with:** `modules/messages/service.ts`, the "reliability" block in `tests/ws/gateway.test.ts`.

---

### Phase 5: Break it, then scale it with Redis ⭐

**Goal:** Alice on instance 1 reaches Bob on instance 2.

**Concepts:** Pub/Sub and its at-most-once nature; subscriber vs command connections; **ref-counting**; the single delivery path; the `MessageBus` interface.

**Build order (important, don't skip the failure):**
1. Run two instances with the in-process delivery you built in Phase 3. **Write the headline test and watch it fail.**
2. Introduce `MessageBus` + `MemoryBus` and a **bus contract test**.
3. Implement `RedisBus` (2 clients, per-topic ref counts) and run the *same contract* against it.
4. Make **all** delivery go DB → bus → every instance → `server.publish`, including the sender's own instance.

**Predict:** If instance A delivered locally *and* the bus echoed the message back, what would the sender see? Why does the plan choose "one delivery path" even though it costs a round trip?

**Test list:** headline cross-instance test; ref count 0→1 subscribes, 1→0 unsubscribes, extra unsubscribe is harmless; closing a socket releases its subscriptions (topic count returns to baseline); subscribe twice → delivered once; unsubscribed sockets get nothing.

**Break it on purpose:** unsubscribe on *every* leave and show a second local socket going deaf. Never unsubscribe and show the topic leak.
**Compare with:** `modules/realtime/*`, `modules/gateway/registry.ts`, `app.ts` (`startServer`), `tests/unit/bus.contract.test.ts`.

---

### Phase 6: Authorization after connect

**Goal:** permissions that stay correct for the life of a long-lived connection.

**Concepts:** per-action checks, positive-only cache-aside, push revocation, token expiry, Origin checks (browsers don't apply CORS to WebSockets).

**Build:** `isMember` (Redis set → Postgres fallback → cache); `invalidateMembership` on remove; the `user:{id}` topic and `room.removed`/`room.added`; close with **4001** after JWT expiry; Origin allowlist.

**Predict:** Why cache only positives? What goes wrong if you cache "not a member"? A user is kicked while connected to instance B and the kick happens on instance A: trace exactly how B finds out.

**Test list:** non-member can't subscribe/send/sync/type; **removed member stops receiving on every instance** and gets `room.removed`; newly added member is told and can subscribe immediately; bad Origin → 403; expired token → close 4001.

**Compare with:** `modules/rooms/membership.ts`, `gateway/index.ts` (`handleUserEvent`, `closeExpired`), the "authorization" tests.

---

### Phase 7: Reliability

**Goal:** survive slow clients, fast clients, reconnects, and deploys.

**Concepts:** per-socket event ordering, backpressure, server-wide WS limits, rate limiting, graceful shutdown, 1012.

**Build:** the per-socket promise-chain queue; `websocket` options on the **root** Elysia instance; Redis rate limiter (`MULTI` INCR+EXPIRE); strike counter → close 4008; drain mode and `stop()`.

**Predict:** Why can two frames from one socket be processed concurrently, and what breaks? What *state* in your handlers is unsafe without the queue?

**Test list:** two rapid sends get ordered seqs (this one is *flaky until you add the queue*, and that's the point); oversize frame closes the socket; flood → `RATE_LIMITED` errors but the socket stays open; counter always has a TTL; drain flips `/ready`, closes sockets with 1012, refuses new upgrades.

**Break it on purpose:** put `maxPayloadLength` on the `.ws()` route and write a test that proves it's ignored.
**Compare with:** `gateway/index.ts` (queue), `app.ts` (`websocketOptions`, `stop`), `modules/ratelimit`.

---

### Phase 8: Presence, typing, read receipts, background jobs

**Goal:** the ephemeral features, and Redis as a toolbox.

**Concepts:** heartbeat sorted sets, transitions-only events, crash-safe expiry, distributed lock + Lua compare-and-delete.

**Build:** `presence/service` (touch/leave/findExpired/onlineAmong); announce to rooms on transitions; `typing` through the bus only (never stored); `read` event + `read.update`; `lock.ts` and the sweeper job.

**Predict:** Why track presence per *connection* instead of per user? Why does "remove on close" leave ghosts when an instance crashes?

**Test list:** first connect/last disconnect only (multi-tab: opening a second tab and closing one produce **no** events); a crashed connection (heartbeat in the past) is reported offline **exactly once** by the sweeper even when two instances race for the lock; lock mutual exclusion; wrong-token release doesn't free someone else's lock; typing/read fan out across instances.

**Compare with:** `modules/presence`, `jobs/*`, `tests/unit/redis-services.test.ts`.

---

### Phase 9: Operate it

**Goal:** see it work like production.

**Build:** `/metrics` counters; a `Dockerfile`; `docker/nginx.conf` + compose `lb` profile; `scripts/lb-smoke.ts`; optional Redis Cluster + sharded Pub/Sub; a small load script (open N sockets across two instances, measure send→receive latency; write the numbers down).

**Predict:** Why `least_conn` rather than round robin for WebSockets? Why do you not need sticky sessions? What does `PUBLISH` cost on an N-node cluster vs `SPUBLISH`?

**Experiments:**
- Kill one app container mid-conversation, and confirm clients reconnect and `sync` fills the gap.
- Run the cluster and hit a real `CROSSSLOT`/`MOVED` error, then fix it.
- Compare `PUBLISH` vs `SPUBLISH` by watching `redis-cli MONITOR` on different nodes.

**Compare with:** `docker/*`, `Dockerfile`, `lib/redis.ts`, `redis-bus.ts` (sharded branch), `tests/ws/cluster.test.ts`.

---

### Phase 10 (optional): The frontend

Build it last; the interesting part is a **client state machine**, not the CSS.

1. A pure reducer with `mergeMessages` (dedupe by id, sort by seq) and unit tests.
2. A socket class with jittered reconnect.
3. The recipe: subscribe → on `room.subscribed` sync from last seq → resend pending with the same `clientMsgId`.
4. Optimistic UI keyed by `clientMsgId`; gap detection on `seq` jumps; throttled typing; read marking when the tab is visible.

**Compare with:** `client/src/state/*`, `client/src/lib/chat-client.ts`.

---

## Part 6: Self-test questions (answer without looking)

1. A message is stored but the Redis publish fails. What does Bob see, and how does he eventually get it?
2. Why is the ack sent before the publish? What if the sender's connection dies between the commit and the ack?
3. Why can't `Date.now()` order messages across instances? What does `seq` give you that an auto-increment id doesn't?
4. Walk through two instances × two clients when instance B's Redis subscriber connection drops and reconnects. What do B's clients miss, and how do they recover?
5. What does `GETDEL` buy you over `GET` then `DEL`?
6. Why does a Redis connection in subscribe mode need a companion connection?
7. Explain ref-counting with an example of each bug (over- and under-unsubscribing).
8. Why must the sweeper be lock-guarded? What breaks if two instances both announce a user offline? What breaks if the lock holder pauses for 40 s?
9. What does idempotency on `(senderId, clientMsgId)` protect against, and where *exactly* in the code does a duplicate get absorbed?
10. Why no sticky sessions? When *would* you need them?
11. What does Redis Cluster change about Pub/Sub, `MULTI`, and pipelines?
12. Why is a per-socket queue needed even though JS is single-threaded?

## Part 7: Extensions (once you've finished)

- Replace the live path with **Redis Streams** (consumer groups, persistence) and compare with Pub/Sub + Postgres sync.
- **Refresh tokens** and token rotation.
- Presence debounce (avoid offline→online flapping on a page reload).
- Message **edits/deletes** (what happens to `seq` and to clients that already hold the old text?).
- Delivery receipts per device; **push notifications** for offline users.
- Cursor-based `before`/`after` history around a specific message; full-text search.
- **Load test** and a Grafana/Prometheus `/metrics` exporter. Add the missing counters (`backpressureCloses` and `instance:*` liveness aren't wired into anything yet).
- Playwright E2E for two real users in two browser contexts. It's the one gap the component-level approach can't close.

## Part 8: Honest limitations of the reference implementation

- No refresh tokens; the JWT lasts an hour, then the client logs in again.
- Presence flaps briefly on a page reload (offline then online).
- `instance:{id}` liveness is written but nothing reads it; the `backpressureCloses` counter is never incremented.
- No room member management in the frontend (the API supports it).
- The membership cache TTL (10 min) is the only protection if an invalidation is missed (a failed `DEL`).
- Prisma `kind`/`role` are enums now, but there is no soft-delete or audit trail.
- The frontend has no automated tests; the backend suite is the quality bar.
- `docker/redis-cluster.sh` runs three masters in one container for convenience; it is a learning setup, not a real cluster topology.

---

## Appendix A: Command cheat sheet

```bash
bun run services:up          # dev + test Postgres/Redis
bun run services:cluster     # optional 3-master Redis Cluster (:7001-7003)
bun run db:deploy            # apply migrations (uses DATABASE_URL)
bun run seed                 # alice / bob, password "password123"
bun run dev                  # backend with watch  (use local DATABASE_URL/REDIS_URL!)
bun test                     # backend suite (needs the test containers)
bun run typecheck
bun run openapi              # regenerate openapi.json
bun run lb:up                # app1 + app2 + nginx on :8080 (docker)
bun scripts/lb-smoke.ts      # prove balancing + cross-instance delivery
cd client && bun run dev --host   # frontend (add --host to reach it from another device)
```

> ⚠️ Your `.env` may point at hosted databases. For local work override explicitly:
> `DATABASE_URL=postgres://chat:chat@localhost:5432/chat REDIS_URL=redis://localhost:6379 bun run dev`.
> The test suite only ever uses `TEST_DATABASE_URL` / `TEST_REDIS_URL` (the local test containers).

## Appendix B: Glossary

- **Fan-out**: delivering one event to many recipients.
- **Pub/Sub (Redis)**: channels you publish to and subscribe from; no storage, at-most-once.
- **Sharded Pub/Sub**: `SPUBLISH`/`SSUBSCRIBE`; a channel lives on one cluster shard.
- **Ref-counting**: counting local users of a shared resource so you release it only when the last user leaves.
- **Idempotency key**: a client-chosen id that makes a repeated request harmless (`clientMsgId`).
- **Keyset pagination**: paging by "after this key" instead of `OFFSET`.
- **Backpressure**: a slow consumer's buffer filling up; you cap it and drop the consumer rather than grow memory.
- **Full jitter**: randomising the whole retry delay to avoid thundering herds.
- **Thundering herd**: everyone retrying at the same instant after an outage.
- **Cache-aside**: read cache → on miss read DB → populate cache; invalidate on writes.
- **CROSSSLOT**: Redis Cluster error when one command/transaction touches keys in different hash slots.
- **Draining**: refusing new work while finishing (or closing) existing work before shutdown.