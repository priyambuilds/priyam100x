# WebSocket protocol

All frames are JSON objects discriminated by `type`. Schemas live in `src/protocol/`.

## Connecting

1. `POST /auth/login` → `{ token }` (JWT, default 1 h)
2. `POST /ws/ticket` with `Authorization: Bearer <token>` → `{ ticket }` (one use, 30 s)
3. `new WebSocket("wss://host/ws?ticket=<ticket>")`

A bad/expired/reused ticket fails the HTTP upgrade (401); a disallowed `Origin` is 403; a draining server is 503.
On success the server sends `connected`.

## Client → server

| `type` | Fields | Notes |
| --- | --- | --- |
| `room.subscribe` | `roomId` | Must be a member. Server replies `room.subscribed`. |
| `room.unsubscribe` | `roomId` | |
| `message.send` | `roomId`, `clientMsgId` (uuid), `body` (1–4000) | Idempotent by `clientMsgId`. Replies `message.ack`. |
| `sync` | `roomId`, `afterSeq` | Replies `sync.result` (max 100; `hasMore`). |
| `typing` | `roomId` | Ephemeral. |
| `read` | `roomId`, `seq` | Moves the read receipt forward only. |
| `heartbeat` | – | Send every ~25 s. Online = a heartbeat in the last 60 s. |

## Server → client

| `type` | Fields |
| --- | --- |
| `connected` | `userId`, `connectionId` |
| `room.subscribed` | `roomId` — safe to `sync` now |
| `message.ack` | `clientMsgId`, `id`, `seq`, `createdAt` — "stored with seq N" |
| `message.new` | `message` `{id, roomId, seq, senderId, clientMsgId, body, createdAt}` (the sender gets its own too) |
| `sync.result` | `roomId`, `messages[]`, `hasMore` |
| `typing` | `roomId`, `userId` |
| `read.update` | `roomId`, `userId`, `seq` |
| `presence.update` | `userId`, `online` — only on transitions |
| `room.added` | `roomId` — you were added; subscribe if it is open |
| `room.removed` | `roomId` — you were removed; the server already unsubscribed you |
| `error` | `code`, `message?`, `clientMsgId?` — never closes the socket |

Error codes: `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_SERVER_ERROR`.
Malformed frames get Elysia's validation reply, not a disconnect.

## Close codes

| Code | Meaning | Client should |
| --- | --- | --- |
| 4001 | JWT expired | re-login if needed, get a new ticket, reconnect |
| 4008 | Repeatedly rate limited | back off |
| 1009 | Frame too large (> 16 KiB) | fix the client |
| 1012 | Server restarting | reconnect with jittered backoff |

## Client algorithm (what the frontend must do for exactly-once-on-screen)

1. Keep `lastSeq` per room; dedupe `message.new` by `id`.
2. On `message.send`, show it as *pending* keyed by `clientMsgId`; swap to confirmed on `message.ack`. After a reconnect, re-send anything still pending with the **same** `clientMsgId`.
3. On (re)connect: ticket → connect → `room.subscribe` per open room → wait for `room.subscribed` → `sync { afterSeq: lastSeq }` until `hasMore` is false. Subscribe **before** sync so nothing falls in the gap; dedupe absorbs the overlap.
4. A jump in `seq` on `message.new` is a gap: `sync`.
5. Reconnect backoff: full jitter, `random(0, min(30 s, 500 ms × 2^attempt))`.
