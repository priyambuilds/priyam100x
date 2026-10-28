import { Elysia, t } from "elysia";
import type { AppDependencies } from "../../deps";
import { AppError } from "../../errors";
import { toMessageDTO } from "../../lib/dto";
import { ClientEvent, CloseCode, type ErrorCode, type ServerEvent } from "../../protocol";
import { consumeTicket } from "../auth/ticket";
import type { Metrics } from "../metrics";
import * as presence from "../presence/service";
import { isRateLimited } from "../ratelimit";
import { roomTopic, userTopic, type BusEvent, type Topic } from "../realtime/bus";
import { isMember } from "../rooms/membership";
import { markRead } from "../rooms/service";
import { saveMessage, syncMessages } from "../messages/service";
import { ConnectionRegistry, type Connection } from "./registry";

/**
 * Bun applies these server-wide, not per route, so they belong on the root
 * Elysia instance (`new Elysia({ websocket })`); putting them on `.ws()` is silently ignored.
 */
export const websocketOptions = {
    idleTimeout: 60,                 // Bun pings; dead TCP peers are dropped after 60 s
    maxPayloadLength: 16 * 1024,     // just above the largest legal frame (4000-char body)
    backpressureLimit: 1024 * 1024,  // a slow client can buffer at most 1 MiB...
    closeOnBackpressureLimit: true,  // ...then it's closed and resyncs on reconnect
};

export type GatewayState = { draining: boolean };
export type Gateway = ReturnType<typeof createGateway>;

const STRIKES_BEFORE_CLOSE = 20;

export function createGateway(deps: AppDependencies, metrics: Metrics, state: GatewayState) {
    const { prisma, redis, bus, config } = deps;
    const registry = new ConnectionRegistry();

    // --- helpers -----------------------------------------------------------
    const fail = (conn: Connection, code: ErrorCode, message?: string, clientMsgId?: string): void => {
        conn.ws.send({ type: 'error', code, message, clientMsgId } satisfies ServerEvent);
    };

    async function joinRoom(conn: Connection, roomId: string) {
        if (conn.rooms.has(roomId)) return; // already joined: don't double-count the ref
        // Record first so a concurrent close() releases the bus ref we're about to take.
        conn.rooms.add(roomId);
        conn.ws.subscribe(roomTopic(roomId));
        try {
            await bus.subscribe(roomTopic(roomId));
        } catch (err) {
            conn.rooms.delete(roomId);
            conn.ws.unsubscribe(roomTopic(roomId));
            throw err;
        }
    }

    async function leaveRoom(conn: Connection, roomId: string) {
        if (!conn.rooms.delete(roomId)) return;
        conn.ws.unsubscribe(roomTopic(roomId));
        await bus.unsubscribe(roomTopic(roomId)).catch(console.error);
    }

    // --- event handlers (thin: validate -> authorize -> call a service) ----
    async function onMessage(conn: Connection, event: typeof ClientEvent.static) {
        const userId = conn.userId;
        const requireMember = async (roomId: string, clientMsgId?: string) => {
            if (await isMember(deps, userId, roomId)) return true;
            fail(conn, 'FORBIDDEN', undefined, clientMsgId);
            return false;
        };

        switch (event.type) {
            case 'heartbeat': {
                if (await presence.touch(redis, userId, conn.ws.id)) await presence.announce(deps, userId, true);
                return;
            }

            case 'room.subscribe': {
                if (!(await requireMember(event.roomId))) return;
                await joinRoom(conn, event.roomId);
                conn.ws.send({ type: 'room.subscribed', roomId: event.roomId } satisfies ServerEvent);
                return;
            }

            case 'room.unsubscribe':
                return leaveRoom(conn, event.roomId);

            case 'sync': {
                if (!(await requireMember(event.roomId))) return;
                metrics.inc('syncRequests');
                const { messages, hasMore } = await syncMessages(prisma, event.roomId, event.afterSeq);
                conn.ws.send({
                    type: 'sync.result', roomId: event.roomId, messages: messages.map(toMessageDTO), hasMore,
                } satisfies ServerEvent);
                return;
            }

            case 'typing': {
                if (!(await requireMember(event.roomId))) return;
                await bus.publish(roomTopic(event.roomId), { type: 'typing', roomId: event.roomId, userId });
                return;
            }

            case 'read': {
                await markRead(deps, userId, event.roomId, event.seq);
                return;
            }

            case 'message.send': {
                if (!(await requireMember(event.roomId, event.clientMsgId))) return;

                if (await isRateLimited(redis, 'msg', userId, config.messageRateLimit)) {
                    metrics.inc('rateLimited');
                    if (++conn.rateLimitStrikes >= STRIKES_BEFORE_CLOSE) {
                        conn.ws.close(CloseCode.RATE_LIMITED, 'RATE_LIMITED');
                        return;
                    }
                    return fail(conn, 'RATE_LIMITED', 'Please slow down!', event.clientMsgId);
                }
                conn.rateLimitStrikes = 0;

                const saved = await saveMessage(prisma, {
                    roomId: event.roomId, senderId: userId, clientMsgId: event.clientMsgId, body: event.body,
                });
                metrics.inc('messagesSent');

                // Ack = "stored with seq N". Sent before publish on purpose.
                conn.ws.send({
                    type: 'message.ack', clientMsgId: saved.clientMsgId, id: saved.id,
                    seq: saved.seq, createdAt: saved.createdAt.toISOString(),
                } satisfies ServerEvent);

                // A publish failure isn't the sender's problem: the message is durable
                // and receivers repair the gap with `sync`.
                await bus.publish(roomTopic(event.roomId), { type: 'message.new', message: toMessageDTO(saved) })
                    .catch((err) => { metrics.inc('publishFailures'); console.error('Publish failed after commit:', err); });
                return;
            }
        }
    }

    // --- the WebSocket route ----------------------------------------------
    const plugin = new Elysia()
        // Runs before the HTTP -> WS upgrade: a bad ticket gets a plain 401 and
        // no socket ever exists, so nothing can be sent before auth finishes.
        .resolve(async ({ query, request, status }) => {
            if (state.draining) return status(503, 'Server is restarting');
            const origin = request.headers.get('origin');
            // Browsers don't apply CORS to WebSockets, so check Origin ourselves.
            if (origin && config.allowedOrigins.length > 0 && !config.allowedOrigins.includes(origin)) {
                return status(403, 'Origin not allowed');
            }
            const ticket = query.ticket ? await consumeTicket(redis, query.ticket) : null;
            if (!ticket) return status(401, 'Invalid or expired ticket');
            return { userId: ticket.userId, tokenExp: ticket.exp };
        })
        .ws('/ws', {
            body: ClientEvent,
            query: t.Object({ ticket: t.String() }),
            detail: {
                summary: 'WebSocket gateway (not representable in OpenAPI)',
                description: 'Upgrade with `GET /ws?ticket=<ticket from POST /ws/ticket>`. Frames are JSON discriminated by `type`; see docs/PROTOCOL.md.',
                tags: ['WebSocket'],
            },

            async open(ws) {
                const conn = registry.add(ws, ws.data.userId, ws.data.tokenExp);
                try {
                    await bus.subscribe(userTopic(conn.userId));
                } catch (err) {
                    console.error(err);
                    return ws.close(1011, 'INTERNAL_SERVER_ERROR');
                }
                // Presence first, so `connected` means "you are now visible as online".
                const cameOnline = await presence.touch(redis, conn.userId, ws.id).catch(() => false);
                ws.send({ type: 'connected', userId: conn.userId, connectionId: ws.id } satisfies ServerEvent);
                if (cameOnline) await presence.announce(deps, conn.userId, true);
            },

            // Bun doesn't wait for an async handler before delivering the next frame, so
            // two quick sends would race and could get seqs in the wrong order. Chain each
            // socket's events so they run one at a time, in arrival order.
            message(ws, event) {
                const conn = registry.get(ws.id);
                if (!conn) return;
                const clientMsgId = event.type === 'message.send' ? event.clientMsgId : undefined;
                conn.queue = conn.queue.then(async () => {
                    try {
                        await onMessage(conn, event);
                    } catch (err) {
                        // Errors are events, not disconnects.
                        if (err instanceof AppError) return fail(conn, err.code as ErrorCode, err.message, clientMsgId);
                        console.error(`[gateway] ${event.type} failed`, err);
                        fail(conn, 'INTERNAL_SERVER_ERROR', 'Something went wrong, retry', clientMsgId);
                    }
                });
            },

            async close(ws) {
                const conn = registry.remove(ws.id);
                if (!conn) return;
                await Promise.all([
                    ...[...conn.rooms].map((roomId) => bus.unsubscribe(roomTopic(roomId)).catch(console.error)),
                    bus.unsubscribe(userTopic(conn.userId)).catch(console.error),
                ]);
                if (await presence.leave(redis, conn.userId, ws.id).catch(() => false)) {
                    await presence.announce(deps, conn.userId, false);
                }
            },
        });

    return {
        plugin,
        registry,

        /** Bus events on `user:*` topics: forwarded to that user's local sockets. */
        handleUserEvent(topic: Topic, event: BusEvent) {
            const userId = topic.slice('user:'.length);
            const { v: _v, ...payload } = event;
            for (const conn of registry.forUser(userId)) {
                if (event.type === 'room.removed') void leaveRoom(conn, String(event.roomId));
                conn.ws.send(payload);
            }
        },

        /** Close sockets whose JWT has expired; the client reconnects with a fresh ticket. */
        closeExpired(nowSeconds = Math.floor(Date.now() / 1000)) {
            for (const conn of registry.all()) {
                if (conn.exp <= nowSeconds) conn.ws.close(CloseCode.UNAUTHORIZED, 'TOKEN_EXPIRED');
            }
        },

        /** Deploys: tell every client to reconnect elsewhere. */
        closeAll(code: number = CloseCode.SERVICE_RESTART, reason = 'SERVICE_RESTART') {
            for (const conn of registry.all()) conn.ws.close(code, reason);
        },
    };
}
