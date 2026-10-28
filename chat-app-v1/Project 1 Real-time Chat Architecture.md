# Project 1: Real-time Chat Architecture

Oct 6, 2026 · @priyam dey

## Goals and scope

Build a chat backend where any number of Elysia instances behind a load balancer act like one server: a message sent to instance A reaches a user connected to instance B, in order, exactly once on screen, and survives a crash.

In scope:

- Group rooms and 1:1 direct messages (a DM is just a room with two members)
- Real-time send and receive over one WebSocket per client
- Durable history in Postgres with paginated scroll-back
- Delivery acks, reconnect with gap recovery, read receipts
- Presence (online/offline) and typing indicators
- Per-user rate limiting

Out of scope for Project 1: file uploads, push notifications, full-text search, end-to-end encryption, message edits. Each is a good follow-up but none teaches anything new about WebSockets or Redis.

What you should own by the end:

1. The WebSocket lifecycle (upgrade, open, message, close, ping/pong) and why a connection is server-side state.
2. Fan-out across processes with Redis Pub/Sub, and its at-most-once guarantee.
3. Making an unreliable transport reliable with sequence numbers, acks and idempotency.
4. Redis as a toolbox: Pub/Sub, TTL keys for presence, counters for rate limits, sets as a cache, and a simple lock.
5. Testing a distributed system in-process: two app instances, one Redis, real WebSocket clients.

These map directly onto Project 2 (high-frequency fan-out) and Project 3 (sequencing, idempotency, locks).

## First principles: why this shape

The whole design follows from one fact: a WebSocket is a live object in one process's memory, so a stateless HTTP mindset stops working.

### Why WebSockets at all

HTTP is request/response: the server can only speak when spoken to. Chat needs the server to push. The options, in order of sophistication:

| Technique | How it pushes | Cost |
| --- | --- | --- |
| Short polling | Client asks every N seconds | Latency up to N, mostly empty requests |
| Long polling | Server holds the request open until there is news | A new HTTP request per message, header overhead |
| Server-Sent Events | One long HTTP response streaming events | Server to client only; sends still need HTTP |
| WebSocket | HTTP `Upgrade` turns the TCP connection into a full-duplex frame channel | Stateful connection the server must manage |

A WebSocket starts as an ordinary `GET` with `Upgrade: websocket`. If the server answers `101 Switching Protocols`, HTTP is gone and both sides exchange small frames on the same TCP socket. That handshake moment is the only time you have HTTP semantics (headers, status codes), which is why auth happens there.

### Why one server is easy and two are not

On one instance, "send to room 42" is a loop over sockets in memory. Bun makes it even cheaper: `ws.subscribe('room:42')` registers the socket on a native topic, and `server.publish('room:42', data)` fans out in Bun's native layer.

Add a second instance and that breaks. Alice is connected to instance A and Bob to instance B. When Alice sends, instance A publishes to its local topic, and Bob's socket is not there. The message is persisted but Bob never sees it live.

Three ways to fix it:

1. **Route by room** (sticky load balancing on room id): every member of a room lands on the same instance. Breaks as soon as a user is in two rooms owned by different instances.
2. **Instance mesh**: every instance connects to every other one. N instances means N×(N−1) links and a discovery problem.
3. **Shared broker**: every instance publishes to and subscribes from one message bus. Each instance has one link, and instances never need to know about each other.

We use option 3 with Redis Pub/Sub as the broker.

### Why Redis Pub/Sub, and what it does not promise

Redis Pub/Sub is in-memory, sub-millisecond, trivial to operate, and you need Redis anyway for presence and rate limits. Its trade-off is the most important thing to internalise in this project: it is **fire-and-forget, at-most-once**. A subscriber that is disconnected when a message is published never gets it. Redis keeps no copy.

So Pub/Sub is the fast path, never the source of truth. Postgres holds every message with a per-room sequence number, and clients recover anything they missed from Postgres. That split, a fast lossy channel plus a durable ordered log, is exactly how your Project 3 exchange will publish market data.

## Architecture

Every instance runs the same Elysia app (HTTP API plus WebSocket gateway); instances share nothing in memory and coordinate only through Redis and Postgres.

&#91;embedded content: chat architecture · 2 instances, 1 message's path\]

Follow the numbers: Alice's message is stored first, then published once, and Redis delivers it back to every instance with a member in the room, including the sender's own.

| Component | Responsibility | Why it lives here |
| --- | --- | --- |
| Load balancer (nginx locally) | Spreads new connections across instances, forwards `Upgrade` headers | Instances are interchangeable, so any one can take any client |
| HTTP API (Elysia routes) | Login, create/join rooms, history pages, issue WS tickets | Request/response work stays on HTTP where caching, status codes and retries are natural |
| WS gateway (`.ws('/ws')`) | Auth at upgrade, decode client events, track local subscriptions | The only code that touches sockets |
| Local fan-out (Bun native topics) | Deliver one payload to every local socket in a room | One `server.publish` call replaces a JS loop over sockets |
| Message bus (Redis Pub/Sub) | Carry events between instances | The only shared, cross-process broadcast |
| Redis keys | Presence, WS tickets, rate limits, membership cache, locks | Fast, TTL-aware, shared state |
| Postgres via Prisma | Users, rooms, members, messages, sequence counters | The durable source of truth and ordering authority |

Two rules keep this sane:

- **One delivery path.** Instances never deliver a chat message to local sockets directly from the send handler. Everything goes Postgres, then Redis, then back down to every instance including the sender's. One path means no duplicate or missing-locally bugs, at the price of one Redis round trip.
- **Instances are disposable.** Nothing in an instance's memory is needed after it dies. Clients reconnect elsewhere and resync from Postgres.

Start as a modular monolith. Splitting the gateway from the API into separate services is a later scaling move, and the bus interface below makes it cheap.

## Message lifecycle

A message is persisted before it is broadcast, so anything a user ever sees live is already durable and has its final sequence number.

Alice (on instance A) sends to room 42; Bob (on instance B) receives:

1. **Client sends** `{ type: 'message.send', roomId: 42, clientMsgId: 'uuid-v4', body: 'hi' }`. The client generates `clientMsgId` and keeps the message as "pending" in its UI.
2. **Validate.** Elysia's `body` schema (TypeBox) rejects malformed frames before your handler runs.
3. **Authorize.** Is Alice a member of room 42? Check the Redis membership set, falling back to Postgres on a miss.
4. **Rate limit.** Increment Alice's counter in Redis; over the limit returns an `error` event, not a dropped socket.
5. **Persist in one Postgres transaction:** increment `Room.lastSeq` (this row lock serializes writers to room 42), insert `Message` with that `seq`. A unique `(senderId, clientMsgId)` makes a retry a no-op.
6. **Ack the sender** `{ type: 'message.ack', clientMsgId, id, seq, createdAt }`. Alice's UI swaps pending for confirmed.
7. **Publish** the stored message to Redis channel `chat:room:42`.
8. **Every instance subscribed to that channel** (A and B) receives it and calls `server.publish('room:42', payload)`.
9. **Bun fans out** to every local socket subscribed to topic `room:42`. Bob gets `{ type: 'message.new', message }`; Alice's other tabs get it too.
10. **Clients dedupe by `id`** and track `lastSeq` per room. A jump in `seq` means a gap, so the client asks for a sync.

Why this order matters:

- **Persist before publish.** If publish fails, the message is still safe and clients recover it on sync. The reverse order could show a message that then vanishes.
- **Ack after persist, not after publish.** The ack means "stored with seq N", which is the guarantee the sender cares about.
- **Sequence assigned by the database.** The server's clock and arrival order across instances are not reliable ordering. A per-room counter in the same transaction is gapless and total.

The exact same pipeline, with a matching engine in place of step 5, is the core loop of your Project 3 exchange.

## Wire protocol

All frames are JSON objects discriminated by a `type` field, defined once as TypeBox unions in a shared `protocol` module so the server validates them and the client gets the same TypeScript types.

Why a discriminated union: one socket carries many kinds of event, and `type` lets both TypeScript narrowing and TypeBox validation pick the right shape. It is the WebSocket equivalent of your HTTP route table.

Client to server:

| `type` | Payload | Notes |
| --- | --- | --- |
| `room.subscribe` | `roomId` | Server checks membership, then `ws.subscribe` + bus ref-count |
| `room.unsubscribe` | `roomId` | Reverse of the above |
| `message.send` | `roomId`, `clientMsgId`, `body` (1 to 4000 chars) | Idempotent by `clientMsgId` |
| `sync` | `roomId`, `afterSeq` | Returns missed messages from Postgres, capped per page |
| `typing` | `roomId` | Ephemeral, never stored |
| `read` | `roomId`, `seq` | Moves the read receipt forward only |

Server to client: `message.ack`, `message.new`, `sync.result` (messages plus `hasMore`), `presence.update`, `typing`, `read.update`, and `error` (`code`, `message`, optional `clientMsgId`).

Sketch of the shape (not final code):

```ts
const MessageSend = t.Object({
  type: t.Literal('message.send'),
  roomId: t.String(),
  clientMsgId: t.String({ format: 'uuid' }),
  body: t.String({ minLength: 1, maxLength: 4000 }),
})
export const ClientEvent = t.Union([RoomSubscribe, MessageSend, Sync, Typing, Read])
export type ClientEvent = typeof ClientEvent.static
```

Conventions worth adopting now:

- **Errors are events, not disconnects.** A bad frame gets `{ type: 'error', code: 'VALIDATION' }`. Close the socket only for auth failure, abuse or shutdown. This mirrors your global HTTP error handler: one place maps domain errors to codes.
- **Close codes are part of the API.** Use 4001 unauthorized or token expired, 4003 forbidden, 4008 rate-limited repeatedly, 1009 frame too large, 1012 server restarting. Clients branch on these to decide whether to reconnect.
- **Version the envelope.** Add `v: 1` to Redis bus payloads so a rolling deploy with two code versions can tell messages apart.
- **Eden Treaty** supports Elysia WebSocket routes, so a typed client for tests comes almost free.

## Redis design

Use one Pub/Sub channel per room, subscribed by an instance only while it has at least one local socket in that room, plus one channel per user for targeted events.

### Channels

| Channel | Carries | Who subscribes |
| --- | --- | --- |
| `chat:room:{roomId}` | `message.new`, `typing`, `read.update`, `presence.update` for that room | Instances with a local subscriber in the room |
| `chat:user:{userId}` | Kicked from room, joined a room, session revoked | Instances with a socket for that user |

Why not one global `chat:messages` channel? Every instance would receive every message from every room and discard most of them. Traffic per instance would grow with total system traffic, not with its own users. Per-room channels make each instance pay only for rooms it serves.

**Reference counting** is the piece people get wrong. Keep a `Map<roomId, number>` per instance. When a socket joins room 42 and the count goes 0 to 1, `SUBSCRIBE chat:room:42`. When it goes 1 to 0 (leave or disconnect), `UNSUBSCRIBE`. Unsubscribing on every leave would cut off the other local sockets; never unsubscribing leaks channels forever.

**Connections.** A Redis connection in subscribe mode can only run (un)subscribe commands. You need at least two clients per instance: one dedicated subscriber and one for publish and normal commands. Bun ships a native Redis client; ioredis is the mature fallback if you hit a gap.

Later, on Redis Cluster, switch to sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`, Redis 7+), so each channel lives on one shard instead of being broadcast to the whole cluster.

### Keys

| Key | Type and TTL | Purpose | Redis concept you learn |
| --- | --- | --- | --- |
| `ws:ticket:{ticket}` | String, 30 s | One-time WS auth ticket, consumed with `GETDEL` | Atomic read-and-delete, TTL |
| `presence:user:{userId}` | Sorted set, member = connectionId, score = last heartbeat ms | Online if any member is newer than 60 s | Sorted sets, range queries, crash-safe expiry |
| `room:members:{roomId}` | Set, 10 min | Membership cache for the authorize step | Cache-aside, invalidation on join/leave |
| `rl:msg:{userId}:{window}` | String counter, window length | Messages per user per window | `INCR` + `EXPIRE` in one `MULTI` or Lua script |
| `lock:{job}` | String, `SET NX PX` | Only one instance runs a cleanup job | Distributed lock with a fencing value |
| `instance:{instanceId}` | String, 30 s, refreshed every 10 s | Liveness of each instance | Heartbeats via TTL |

Notes on the less obvious ones:

- **Presence uses heartbeats, not close events.** A crashed instance never fires `close`, so "remove on disconnect" leaves ghosts online forever. A timestamped sorted set self-heals: stale members fall out of the 60 s window, and `ZREMRANGEBYSCORE` trims them. Publish `presence.update` only on online/offline transitions, not every heartbeat.
- **Typing** goes only through Pub/Sub and is never stored. Clients throttle sends to one every few seconds and hide the indicator after a short timeout with no update.
- **The lock is honest about its limits.** Chat barely needs one; a single-runner sweeper job is a safe place to practise. Release it with a Lua compare-and-delete so you never delete another holder's lock. Project 3 is where locks get serious.

## Auth on the WebSocket upgrade

Authenticate once, during the HTTP upgrade, using a short-lived one-time ticket; after `101` there are no headers and no status codes, so it is the only clean place to say no.

### The problem with your existing Bearer plugin

The browser `WebSocket` API cannot set an `Authorization` header. The common workarounds each leak something:

| Option | Problem |
| --- | --- |
| JWT in the query string `?token=` | Long-lived token ends up in proxy and access logs |
| JWT smuggled in `Sec-WebSocket-Protocol` | Abuses a header meant for subprotocol negotiation |
| Cookie | Works, but needs CSRF-style origin checks and couples you to cookies |
| **One-time ticket** | An extra HTTP call per connect, which is negligible |

### Ticket flow (recommended)

1. Client calls `POST /ws/ticket` with its normal Bearer JWT. Your existing JWT plugin and guards protect it unchanged.
2. Server stores `ws:ticket:{random 32 bytes}` = `userId` in Redis with a 30 s TTL and returns the ticket.
3. Client opens `wss://host/ws?ticket=...`.
4. In the WS route's `beforeHandle` (runs before the upgrade), `GETDEL` the ticket. Missing means expired or reused: return 401 and no socket is ever created.
5. Put `userId` into context (via `.resolve()`, which Elysia exposes on `ws.data`), so `open`/`message` handlers get a typed user without re-checking.

A leaked ticket is useless after one use or 30 s, and the real JWT never touches a URL. `GETDEL` is atomic, so two simultaneous connects with the same ticket cannot both win; this is the same race thinking as your idempotency keys.

Also check the `Origin` header in `beforeHandle` against an allowlist. Browsers do not apply CORS to WebSockets, so this is your cross-site protection.

### Authorization after connect

A connection lives for hours, but permissions change in seconds. Three mechanisms keep them in sync:

- **Per-action checks.** `room.subscribe` and `message.send` check membership (cached set), never trusting that a past check still holds.
- **Push revocation.** When a user is removed from a room, publish to `chat:user:{userId}`. Every instance holding that user's sockets calls `ws.unsubscribe('room:42')` and decrements the ref count.
- **Token lifetime.** Record the JWT `exp` at connect. A periodic check closes expired sockets with 4001, and the client reconnects with a fresh ticket.

Role guards you already wrote (`onBeforeHandle`) apply to the HTTP routes as-is; for WS events, write a small `authorize(user, action, roomId)` service and call it from the message handler.

## Persistence

Postgres owns ordering: each room keeps a `lastSeq` counter, and every message gets the next value inside the same transaction that inserts it.

### Schema sketch

```prisma
model Room {
  id        String       @id @default(uuid())
  kind      RoomKind     // DIRECT | GROUP
  name      String?
  lastSeq   Int          @default(0)
  createdAt DateTime     @default(now())
  members   RoomMember[]
  messages  Message[]
}

model RoomMember {
  roomId      String
  userId      String
  role        MemberRole @default(MEMBER) // OWNER | ADMIN | MEMBER
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
  @@unique([roomId, seq])            // ordering + the pagination index
  @@unique([senderId, clientMsgId])  // idempotent retries
}
```

DMs need one more guard: a unique key on the sorted user pair (for example a `dmKey` column such as `"userA:userB"`) so two concurrent "start DM" requests cannot create two rooms. That is your `@@unique` double-booking trick again.

### Why a counter row and not something else

| Ordering source | Verdict |
| --- | --- |
| `createdAt` timestamp | Clock skew across instances; ties within a millisecond |
| Global auto-increment id | Ordered, but gaps per room make client gap detection impossible |
| Redis `INCR` per room | Fast, but if the Postgres insert then fails you leave a permanent gap |
| **`Room.lastSeq` incremented in the insert transaction** | Gapless and total per room; a failed insert rolls the increment back |

The cost is that the `UPDATE` takes a row lock, so sends to the same room are serialized. For chat that is correct and cheap. Write it as a Prisma interactive transaction: update the room with `lastSeq: { increment: 1 }`, read back the value, create the message.

### Idempotency

If the client retries after a lost ack, the insert hits `P2002` on `(senderId, clientMsgId)`. The transaction rolls back (including the increment), you load the existing message and send the same ack again. The client cannot tell a retry from the first attempt, exactly like your wallet idempotency keys.

### Reading history

Use keyset pagination, never `OFFSET`: `WHERE roomId = ? AND seq < ? ORDER BY seq DESC LIMIT 50`. It is served straight off the `(roomId, seq)` index and stays fast at any depth, and new messages arriving do not shift the pages. The same query with `seq > afterSeq ORDER BY seq ASC` powers `sync`.

Unread counts fall out for free: `room.lastSeq - member.lastReadSeq`. Read receipts only move forward, so update with `WHERE lastReadSeq < :seq`.

## Failure modes and delivery guarantees

The system promises at-least-once delivery from Postgres plus client-side dedupe by message id, which the user experiences as exactly-once; Redis only makes it fast.

| What fails | What happens | How the design recovers |
| --- | --- | --- |
| Client network drops | Messages published meanwhile are missed | Reconnect, resubscribe, `sync { afterSeq: lastSeq }` per room |
| Ack lost on the way back | Client thinks the send failed | Client retries with the same `clientMsgId`; server re-acks the stored message |
| Redis publish fails after commit | Message stored, nobody notified live | Next message reveals a `seq` gap, client syncs; or the client's periodic sync catches it |
| Instance's Redis subscriber disconnects | That instance's clients silently miss events | On subscriber reconnect, resubscribe all ref-counted rooms and push a `resync` hint to local sockets |
| Instance crashes | Its sockets die with no `close` handler | Clients reconnect elsewhere; presence entries expire by heartbeat |
| Redis down entirely | No live fan-out, no tickets, no rate limits | Sends still persist if you fail open on rate limits; new connects fail until Redis returns. Decide this policy explicitly |
| Postgres down | Cannot persist, so cannot send | Return `error` with a retryable code; never broadcast unpersisted messages |
| Slow client | Bun buffers outgoing frames for it | Set a backpressure limit and close slow sockets; they resync on reconnect |

### Reconnect protocol (client side)

1. Exponential backoff with full jitter (e.g. random 0 to min(30 s, 500 ms × 2^attempt)). Without jitter, a restarted instance's clients all reconnect in the same instant: a thundering herd.
2. Fetch a new ticket, connect, re-send `room.subscribe` for open rooms.
3. For each room, `sync` from the last contiguous `seq` it holds, paging until `hasMore` is false.
4. Re-send any messages still "pending" with their original `clientMsgId`.

The subscribe-then-sync order matters: subscribing first means nothing published during the sync is lost, and the dedupe by `id` absorbs the overlap.

### Liveness and slow consumers

- **Ping/pong.** Bun sends WebSocket pings and enforces `idleTimeout`, which detects dead TCP connections that never sent a FIN. Tune it in the `websocket` options.
- **Backpressure.** `ws.send` reports when data was buffered or dropped. Configure `backpressureLimit` and `closeOnBackpressureLimit` so one slow phone cannot grow server memory without bound. Dropping the slow client is safe because sync repairs it.
- **Max payload.** Set `maxPayloadLength` to just above your largest legal frame; oversize frames close with 1009.

### Graceful shutdown (deploys)

On `SIGTERM`: fail the load balancer health check, stop accepting upgrades, close each socket with 1012 "service restart", unsubscribe from Redis, wait for in-flight sends to commit, then exit. Clients reconnect with jitter to the remaining instances.

## Scaling and operations

This design scales out by adding instances until one of three shared bottlenecks binds: the Redis Pub/Sub node, the per-room row lock, or fan-out to very large rooms.

| Bottleneck | Why it binds | Next move |
| --- | --- | --- |
| Redis Pub/Sub throughput | Every published message is copied to every subscribing instance on one Redis node | Sharded Pub/Sub on Redis Cluster; compact payloads |
| One hot room | The `lastSeq` row lock serializes its writes | Acceptable for chat. If it ever binds, assign seq in a single-writer process per room: the matching-engine pattern of Project 3 |
| Huge rooms (thousands of members) | One message becomes thousands of socket writes | Bun native topics help a lot; beyond that, batch or drop presence/typing in large rooms |
| Connections per instance | Memory per socket plus file descriptors | Raise `ulimit -n`, measure memory per idle socket, add instances |
| Postgres writes | One transaction per message | Connection pooling (PgBouncer), then partition `Message` by room or time |

Load balancing notes:

- **No sticky sessions needed.** Once upgraded, a WebSocket is naturally pinned to its instance for its whole life. Stickiness only matters for transports that span several HTTP requests.
- **Balance on connection count, not round robin.** Connections are long-lived, so after a deploy round robin leaves older instances overloaded. `least_conn` in nginx is the simple fix.
- **Proxy timeouts.** nginx closes idle proxied connections after 60 s by default. Raise `proxy_read_timeout` or make sure pings flow more often than that.

What to measure from day one, because you cannot tune what you cannot see:

- Open connections per instance, and subscribed Redis channels per instance
- Send-to-receive latency (stamp at ack, measure at a test receiver on another instance)
- Sync requests per minute: a spike means the live path is losing messages
- Backpressure closes and rate-limit rejections

For load testing, a small Bun script that opens many WebSocket clients across two instances is enough to find your first bottleneck. Record your numbers; they become the baseline for Project 2.

## Project structure and testing

Hide Redis behind a `MessageBus` interface injected with `.decorate()`, so unit tests run against an in-memory bus and integration tests run two real app instances against one real Redis.

```text
src/
  app.ts                  // createApp(deps): Elysia, used by main and by tests
  main.ts                 // wires real Redis + Prisma, listens, handles SIGTERM
  protocol/               // TypeBox ClientEvent / ServerEvent / BusEvent unions
  lib/
    prisma.ts
    redis.ts              // command client + dedicated subscriber client
  modules/
    auth/                 // existing JWT plugin, POST /ws/ticket
    rooms/                // HTTP: create, join, leave, history (keyset pages)
    messages/             // send service: transaction, seq, idempotency
    gateway/              // .ws('/ws'): beforeHandle, open, message, close
    realtime/
      bus.ts              // interface MessageBus { publish, subscribe, unsubscribe }
      redis-bus.ts        // ref-counted channel subscriptions
      memory-bus.ts       // same contract, for unit tests
    presence/             // heartbeat sorted sets, transition events
    ratelimit/            // INCR window, Elysia-friendly guard
  errors/                 // domain errors to error codes and close codes
```

Why `createApp(deps)`: the test suite can boot two instances in one process, each with its own Redis clients, on port 0. That is the cheapest possible multi-instance environment.

The gateway handler should stay thin: decode, call a service, map the result to an event. All logic lives in services that know nothing about sockets, so they are unit-testable without a WebSocket.

### Test plan

| Path | Example cases |
| --- | --- |
| Happy | Send in a room, receiver on the same instance gets it; receiver on the other instance gets it; history pages return in `seq` order |
| Sad | Missing, expired or reused ticket rejects the upgrade with 401; non-member `message.send` gets `error FORBIDDEN`; bad `Origin` is rejected |
| Conflict | Same `clientMsgId` sent twice concurrently gives one row and two identical acks; 50 concurrent sends to one room give `seq` 1 to 50 with no gaps or duplicates; two concurrent "start DM" calls create one room |
| Validation | Unknown `type`, empty body, body over 4000 chars, non-uuid `clientMsgId`; frame over `maxPayloadLength` closes with 1009 |
| Resilience | Kill a client mid-stream, reconnect, `sync` returns exactly the missed messages; drop the subscriber client, it resubscribes; removed member stops receiving on every instance |
| Bus contract | One suite run against both `MemoryBus` and `RedisBus`: ref count 0 to 1 subscribes, 1 to 0 unsubscribes, no leaks after disconnect |

The headline test, worth writing first in Phase 3, is: client A on instance 1, client B on instance 2, A sends, B receives within a timeout. It fails without Redis and passes with it.

Isolation: give each test file its own Postgres schema (as you did before) and a unique Redis key and channel prefix, then `FLUSHDB` only in a dedicated test database index. Wrap WebSocket receives in a small `nextEvent(ws, type, timeoutMs)` helper so tests await events instead of sleeping.

## Phased build order

Build single-instance first, then break it on purpose with a second instance, then fix it with Redis; feeling the failure is what makes the fix stick.

| Phase | Build | You learn | Done when |
| --- | --- | --- | --- |
| 0. Foundations | Docker Compose with Postgres and Redis, Prisma schema, reuse your JWT auth, `createApp(deps)` | Project skeleton for testable multi-instance apps | `bun test` boots the app on port 0 against both services |
| 1. Single-instance chat | `.ws('/ws')`, TypeBox protocol, `room.subscribe`, Bun native topics, in-memory send | WS lifecycle, `ws.data`, validation on frames, close codes | Two clients on one instance chat; validation and sad-path tests pass |
| 2. Durable messages | Send transaction with `lastSeq`, idempotent `clientMsgId`, `message.ack`, history endpoint, `sync` | Ordering, idempotency, keyset pagination | 50 concurrent sends give gapless seq; duplicate send gives one row |
| 3. Break it, then scale it | Two instances behind nginx; watch cross-instance chat fail. Then `RedisBus` with ref-counted per-room channels | Pub/Sub, subscriber vs command connections, single delivery path | Headline test passes: A on instance 1 reaches B on instance 2 |
| 4. Auth hardening | Ticket endpoint and `GETDEL`, `Origin` check, membership cache, user channel revocation, token expiry close | Upgrade-time auth, cache-aside, push invalidation | Reused ticket rejected; removed member stops receiving on all instances |
| 5. Reliability | Client reconnect with jitter, gap detection, subscriber reconnect and resubscribe, backpressure limits, graceful `SIGTERM` | Delivery guarantees in practice | Kill an instance mid-conversation; no message is lost after resync |
| 6. Presence and friends | Heartbeat sorted sets, presence transitions, typing, read receipts, rate limiting | TTL design, sorted sets, atomic counters | Crashed instance's users go offline within the window; flood gets rate-limited |
| 7. Operate it | Metrics, a load-test script, a lock-guarded sweeper job | Measuring, distributed locks and their limits | You have baseline latency and connection numbers written down |

Stretch goals once Phase 7 is done: replace the live path with Redis Streams (persistent, consumer groups) and compare it to Pub/Sub plus Postgres sync. That comparison is a direct warm-up for the message queues in Project 3.

Open decision for you before Phase 1: build a tiny browser client (useful for seeing it work) or stay test-and-script only (faster). The plan works either way.
