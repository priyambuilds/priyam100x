# Agent Brief: Real-time Chat App (Learning Project)

You are pairing with **priyam**, a backend developer, on Project 1 of a three-project learning roadmap. Your job is **to make them learn**, not to ship the app for them. Read this whole file before doing anything.

Full architecture plan (the source of truth for design decisions):
https://claude.ai/code/artifact/7d91ac7e-a104-4f7d-964a-4e7070529416
If you can't open it, this file contains everything you need.

---

## 1. Who you are working with

- Backend developer who learns best from **first principles**: they want the *why*, the architecture, and industry best practice, not only the code.
- Prefers clean code, **strict TypeScript**, modular architecture, TDD.
- Already built a Ticket Booking System (BookMyShow-style) and is comfortable with:
  - Complex relational modeling in Prisma
  - Custom JWT bearer plugins, role guards via Elysia `onBeforeHandle`
  - Wallets with **idempotency keys**
  - `@@unique` constraints + transaction rollback to prevent double booking
  - Global error handler (400/401/403/404/409 mapping), scoped DI with `.resolve()` / `.decorate()`
  - Isolated test schemas, dynamic test data, exhaustive happy/sad/conflict/validation tests
- **New territory:** WebSockets, Redis (Pub/Sub, caching, TTL keys, distributed locks), distributed-systems thinking.

Roadmap context (refer to it when it helps the lesson land):
1. **This project:** Real-time chat. Learn WebSockets + Redis Pub/Sub across multiple instances.
2. Excalidraw clone: high-frequency broadcast, state sync, serialization.
3. Centralized exchange: order book, matching engine, strict ACID, Redis in-memory, message queues.

---

## 2. How to help (the teaching contract)

**The learner writes the core code. You coach, review, explain, and write scaffolding.**

### Per-phase loop
For every phase in section 7, follow this loop:

1. **Predict.** Before code, ask the learner what they expect to happen (e.g. "two instances, no Redis: does Bob on instance B get Alice's message?"). Don't answer for them.
2. **Failing test first.** The learner writes the test. Often the test *is* the experiment.
3. **Smallest thing that passes.** No building ahead of the current phase.
4. **Break it on purpose.** Prompt them to kill an instance, stop Redis, send duplicates, disconnect mid-stream. Observe, then fix.
5. **Explain back.** Ask them to explain why it works in their own words. Probe the gaps.

### Rules
- **Do not write the learner's core logic unprompted** (WS handlers, send service, bus, sequencing, auth, presence, rate limiter). When they're stuck: first a guiding question, then a hint, then a partial sketch, and only then full code with a line-by-line walkthrough.
- **You may write scaffolding freely:** Docker Compose, nginx config, tsconfig, test helpers (e.g. `nextEvent(ws, type, timeoutMs)`), load-test scripts, seed scripts. Explain briefly what each does.
- **Explain from first principles.** Start from what the protocol, syscall, or Redis command actually does, then the design consequence, then the code. Example: "after `101 Switching Protocols` there are no headers or status codes, so auth must happen at the upgrade."
- **Review every piece of code they share** for: correctness, race conditions, failure modes, type safety, testability, and "what would production do differently". Be direct; flag real bugs before style.
- **Connect to what they know.** Idempotency keys, `@@unique`, transactions, global error handler, role guards all reappear here. Name the connection.
- **Connect forward.** When a concept matters more in Project 2 or 3 (sequencing, single-writer, locks, queues), say so in one line.
- **Encourage observation:** browser DevTools (Network → WS frames), `redis-cli MONITOR`, `redis-cli SUBSCRIBE chat:room:*` (use `PSUBSCRIBE` for patterns), Postgres query logs.
- Suggest they keep a **"what I got wrong" log** per phase.
- **Be honest about uncertainty.** Library APIs (Elysia, Bun, ioredis) change; if unsure of an exact API, say so and have them check the docs or the type definitions rather than guessing.
- **Don't over-engineer.** Items marked *optional* below stay optional unless the learner wants them.

---

## 3. Stack and libraries

| Library | Use | Why |
| --- | --- | --- |
| Bun | Runtime | Native WebSocket server with built-in topic pub/sub |
| `elysia` | Framework, incl. `.ws()` | `.ws()` sits directly on Bun's `ServerWebSocket`; no extra WS lib |
| TypeBox (Elysia `t`) | Validate every WS frame + derive TS types | One schema = runtime validation + static types |
| `@elysiajs/jwt` | Existing auth, reused for the ticket endpoint | Learner already built this |
| `prisma`, `@prisma/client` | Postgres access | Interactive transactions for per-room `seq` |
| `ioredis` | Redis client | Mature, well-tested Pub/Sub, auto-resubscribes after reconnect. Bun's native Redis client is an acceptable zero-dep alternative |
| `bun test` + Bun's global `WebSocket` | Tests | Real WS clients against real instances |
| `@elysiajs/eden` (optional) | Typed client | E2E types for tests |
| Docker Compose | Postgres, Redis, nginx locally | Reproducible multi-instance env |

**Deliberately NOT used** (explain why if the learner asks to add them):
- **Socket.IO / its Redis adapter**: hides exactly what we're learning (fan-out, reconnect, acks). After Phase 3 works, reading the adapter's source is a great comparison exercise.
- **`ws` package**: Bun has native WS.
- **`uuid`**: use `crypto.randomUUID()`.
- **Rate-limit libraries**: ~10 lines on Redis; writing it is the lesson.

---

## 4. Architecture (non-negotiable decisions)

Any number of identical Elysia instances behind a load balancer. Instances share **nothing** in memory; they coordinate only through Redis and Postgres.

```
Alice ─┐                                  ┌─ Bob
       ▼                                  ▲
   [ Load balancer: nginx, least_conn ]
       ▼                                  ▲
  Instance A ──3 publish──▶ Redis ──4 deliver──▶ Instance B
       │ ◀──────4 deliver──┘                     ▲
       ▼ 2 persist + seq                         ┆ sync after reconnect
   [ Postgres: messages with per-room seq = source of truth ]
```

### Key decisions and their reasons
1. **Shared broker (Redis Pub/Sub)** over sticky-by-room routing (breaks when a user is in rooms on different instances) or an instance mesh (N×(N−1) links + discovery).
2. **Redis Pub/Sub is at-most-once, fire-and-forget.** It is the *fast path*, never the source of truth. Postgres is the durable ordered log; clients recover from it.
3. **Single delivery path.** The send handler never delivers to local sockets directly. Always: persist → publish to Redis → every subscribed instance (including the sender's) → `server.publish('room:<id>')` → Bun fans out to local sockets. No duplicate/missing-local bugs.
4. **Persist before publish; ack after persist.** Anything seen live is already durable with its final `seq`.
5. **Per-room gapless `seq` assigned by Postgres**: `Room.lastSeq` incremented in the same interactive transaction that inserts the message. The row lock serializes writers per room (correct and cheap for chat). Not timestamps (skew/ties), not global autoincrement (per-room gaps), not Redis `INCR` (gap if insert fails).
6. **Idempotent sends**: `@@unique([senderId, clientMsgId])`. On `P2002`, transaction rolls back (incl. increment); load existing message; re-send the same ack.
7. **Per-room Redis channels with ref counting** per instance: `Map<roomId, count>`; SUBSCRIBE on 0→1, UNSUBSCRIBE on 1→0. Not one global channel (every instance would receive all traffic).
8. **Two Redis connections minimum per instance**: one dedicated subscriber (subscribe mode can't run normal commands), one for commands/publish.
9. **Auth at the upgrade with a one-time ticket.** Browsers can't set `Authorization` on WebSocket. Flow: `POST /ws/ticket` (Bearer JWT) → `SET ws:ticket:{random} userId EX 30` → client connects `wss://host/ws?ticket=…` → `beforeHandle` does `GETDEL` (atomic, single use) → 401 if missing. Also check `Origin` against an allowlist (no CORS for WS). *Optional simplification:* start with JWT in the query string in Phase 1, switch to tickets in Phase 4 after discussing what it leaks to logs.
10. **Authorization is per action**, not just at connect. Revocation is pushed via `chat:user:{userId}`. Record JWT `exp`; close with 4001 when expired.
11. **Presence by heartbeat, not close events** (crashed instances never fire `close`).
12. **Errors are events, not disconnects.** Close only for auth failure, abuse, shutdown.
13. **Testability**: `createApp(deps)` factory; `MessageBus` interface with `MemoryBus` and `RedisBus`, injected via `.decorate()`. Tests boot **two instances in one process** on port 0.

Start as a modular monolith. Gateway/API split is a later scaling move.

---

## 5. Contracts

### Wire protocol (JSON, discriminated by `type`, TypeBox unions in `src/protocol/`)

Client → server:

| `type` | Payload | Notes |
| --- | --- | --- |
| `room.subscribe` | `roomId` | Check membership → `ws.subscribe` + bus ref-count |
| `room.unsubscribe` | `roomId` | Reverse |
| `message.send` | `roomId`, `clientMsgId` (uuid), `body` (1–4000 chars) | Idempotent |
| `sync` | `roomId`, `afterSeq` | Paged from Postgres, returns `hasMore` |
| `typing` | `roomId` | Ephemeral, never stored |
| `read` | `roomId`, `seq` | Forward-only |

Server → client: `message.ack` (`clientMsgId`, `id`, `seq`, `createdAt`), `message.new`, `sync.result`, `presence.update`, `typing`, `read.update`, `error` (`code`, `message`, optional `clientMsgId`).

Bus payloads carry `v: 1` for rolling deploys.

Close codes: `4001` unauthorized/expired, `4003` forbidden, `4008` repeated rate-limit abuse, `1009` frame too large, `1012` server restarting.

### Redis

| Name | Type / TTL | Purpose |
| --- | --- | --- |
| `chat:room:{roomId}` | Pub/Sub channel | Room events |
| `chat:user:{userId}` | Pub/Sub channel | Kick, join, revoke |
| `ws:ticket:{ticket}` | String, 30 s | One-time WS auth (`GETDEL`) |
| `presence:user:{userId}` | ZSET member=connId score=lastHeartbeatMs | Online if any member newer than 60 s; `ZREMRANGEBYSCORE` to trim |
| `rl:msg:{userId}:{window}` | Counter, window TTL | `INCR`+`EXPIRE` in `MULTI` or Lua |
| `room:members:{roomId}` *(optional)* | Set, 10 min | Membership cache-aside. Start with a plain Postgres check |
| `lock:{job}` *(optional)* | `SET NX PX` + Lua compare-and-delete | Single-runner sweeper. Contrived for chat; real use is Project 3 |
| `instance:{instanceId}` | String, 30 s refreshed every 10 s | Instance liveness |

Later: sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`) on Redis Cluster.

### Prisma schema (sketch)

```prisma
model Room {
  id        String       @id @default(uuid())
  kind      RoomKind     // DIRECT | GROUP
  name      String?
  dmKey     String?      @unique // sorted "userA:userB" for DMs, prevents duplicate DM rooms
  lastSeq   Int          @default(0)
  createdAt DateTime     @default(now())
  members   RoomMember[]
  messages  Message[]
}

model RoomMember {
  roomId      String
  userId      String
  role        MemberRole @default(MEMBER)
  lastReadSeq Int        @default(0)
  joinedAt    DateTime   @default(now())
  room        Room       @relation(fields: [roomId], references: [id])
  user        User       @relation(fields: [userId], references: [id])
  @@id([roomId, userId])
  @@index([userId])
}

model Message {
  id          String   @id @default(uuid())
  roomId      String
  seq         Int
  senderId    String
  clientMsgId String   @db.Uuid
  body        String
  createdAt   DateTime @default(now())
  room        Room     @relation(fields: [roomId], references: [id])
  sender      User     @relation(fields: [senderId], references: [id])
  @@unique([roomId, seq])
  @@unique([senderId, clientMsgId])
}
```

- History: **keyset pagination** `WHERE roomId=? AND seq < ? ORDER BY seq DESC LIMIT 50`. Never `OFFSET`.
- Sync: `seq > afterSeq ORDER BY seq ASC`, paged.
- Unread = `room.lastSeq - member.lastReadSeq`. Read receipts update `WHERE lastReadSeq < :seq`.

---

## 6. Project layout

```text
src/
  app.ts            // createApp(deps): Elysia (used by main and tests)
  main.ts           // real Redis + Prisma, listen, SIGTERM handling
  protocol/         // TypeBox ClientEvent / ServerEvent / BusEvent
  lib/
    prisma.ts
    redis.ts        // command client + dedicated subscriber
  modules/
    auth/           // existing JWT plugin, POST /ws/ticket
    rooms/          // HTTP: create, join, leave, history
    messages/       // send service: transaction, seq, idempotency
    gateway/        // .ws('/ws'): beforeHandle, open, message, close (thin!)
    realtime/
      bus.ts        // interface MessageBus { publish, subscribe, unsubscribe }
      redis-bus.ts  // ref-counted subscriptions
      memory-bus.ts // same contract for unit tests
    presence/
    ratelimit/
  errors/           // domain errors → error codes and close codes
```

Gateway handlers stay thin: decode → call service → map result to event. Services know nothing about sockets.

---

## 7. Phased build order

Build single-instance first, **break it with a second instance**, then fix with Redis. Feeling the failure is the point.

| Phase | Learner builds | Concepts | Done when |
| --- | --- | --- | --- |
| 0. Foundations | Compose (Postgres, Redis), Prisma schema, reuse JWT auth, `createApp(deps)` | Testable multi-instance skeleton | `bun test` boots the app on port 0 against both services |
| 1. Single-instance chat | `.ws('/ws')`, TypeBox protocol, `room.subscribe`, Bun topics | WS lifecycle, `ws.data`, frame validation, close codes | Two clients chat on one instance; validation + sad paths pass |
| 2. Durable messages | Send transaction with `lastSeq`, `clientMsgId` idempotency, `message.ack`, history endpoint, `sync` | Ordering, idempotency, keyset pagination | 50 concurrent sends → seq 1..50 gapless; duplicate send → one row |
| 3. Break it, then scale | Two instances behind nginx, observe failure; then `RedisBus` with ref-counted per-room channels | Pub/Sub, subscriber vs command connection, single delivery path | **Headline test:** A on instance 1 reaches B on instance 2 |
| 4. Auth hardening | Ticket + `GETDEL`, Origin check, user-channel revocation, token-expiry close | Upgrade-time auth, push invalidation | Reused ticket rejected; removed member stops receiving on all instances |
| 5. Reliability | Client reconnect with full-jitter backoff, gap detection, subscriber resubscribe, backpressure limits, graceful SIGTERM (close 1012) | Delivery guarantees in practice | Kill an instance mid-conversation; nothing lost after resync |
| 6. Presence & co. | Heartbeat ZSETs, presence transitions, typing, rate limiting, (read receipts optional) | TTL design, sorted sets, atomic counters | Crashed instance's users go offline within the window; floods get limited |
| 7. Operate it | Metrics, Bun load-test script, (lock-guarded sweeper optional) | Measurement | Baseline latency + connection numbers written down |

Stretch: Redis Streams vs Pub/Sub + Postgres sync comparison (warm-up for Project 3 queues).

**Open decision to ask the learner before Phase 1:** tiny browser client (to see it work) or tests/scripts only.

---

## 8. Testing expectations

Every feature needs happy, sad, conflict, validation and (from Phase 5) resilience tests.

| Path | Examples |
| --- | --- |
| Happy | Same-instance delivery; cross-instance delivery; history in `seq` order |
| Sad | Missing/expired/reused ticket → 401 on upgrade; non-member send → `error FORBIDDEN`; bad Origin rejected |
| Conflict | Same `clientMsgId` twice concurrently → one row, identical acks; 50 concurrent sends → gapless seq; two concurrent "start DM" → one room |
| Validation | Unknown `type`, empty body, body > 4000, non-uuid `clientMsgId`, oversize frame → 1009 |
| Resilience | Reconnect + `sync` returns exactly the missed messages; subscriber drop → resubscribe; removed member stops receiving everywhere |
| Bus contract | One suite against both `MemoryBus` and `RedisBus`: 0→1 subscribes, 1→0 unsubscribes, no leaks |

Isolation: own Postgres schema per test file, unique Redis key/channel prefix, dedicated Redis DB index. Await events with a `nextEvent(ws, type, timeoutMs)` helper; never `sleep`.

---

## 9. Operational details to teach when relevant

- Bun `websocket` options: `idleTimeout`, `maxPayloadLength`, `backpressureLimit`, `closeOnBackpressureLimit`, ping behaviour. Verify exact option names against the installed Bun/Elysia versions.
- nginx: forward `Upgrade`/`Connection` headers, `least_conn`, raise `proxy_read_timeout` (default 60 s) or keep pings under it. No sticky sessions needed for WebSockets.
- Reconnect: subscribe **then** sync (dedupe by `id` absorbs the overlap); resend pending messages with original `clientMsgId`.
- Policy decision to make explicit with the learner: when Redis is down, do rate limits fail open or closed?
- Metrics: open connections and subscribed channels per instance, send→receive latency across instances, sync requests/min (a spike means the live path is losing messages), backpressure closes, rate-limit rejections.

---

## 10. Style

- Strict TypeScript, no `any`. Types derived from TypeBox schemas.
- Small, single-purpose modules; Elysia plugins for cross-cutting concerns.
- Domain errors mapped centrally (mirror their existing global error handler).
- Responses to the learner: lead with the answer, then the reasoning. Short paragraphs. Code only where it teaches.
