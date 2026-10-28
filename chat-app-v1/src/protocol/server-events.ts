import type { MessageDTO } from '../lib/dto';

export type ErrorCode =
  | 'VALIDATION' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';

// Frames the server pushes (directly, or via the Redis bus).
export type ServerEvent =
  | { type: 'connected'; userId: string; connectionId: string }
  | { type: 'room.subscribed'; roomId: string } // safe to `sync` now: nothing published from here on is missed
  | { type: 'message.ack'; clientMsgId: string; id: string; seq: number; createdAt: string }
  | { type: 'message.new'; message: MessageDTO }
  | { type: 'sync.result'; roomId: string; messages: MessageDTO[]; hasMore: boolean }
  | { type: 'typing'; roomId: string; userId: string }
  | { type: 'read.update'; roomId: string; userId: string; seq: number }
  | { type: 'presence.update'; userId: string; online: boolean }
  | { type: 'room.added'; roomId: string }
  | { type: 'room.removed'; roomId: string }
  | { type: 'error'; code: ErrorCode; message?: string; clientMsgId?: string };

/** WebSocket close codes clients should branch on. */
export const CloseCode = {
  UNAUTHORIZED: 4001,   // token expired / revoked: fetch a new ticket, then reconnect
  RATE_LIMITED: 4008,
  SERVICE_RESTART: 1012, // deploy: reconnect with jitter
} as const;
