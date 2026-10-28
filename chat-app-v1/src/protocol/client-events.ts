import { t } from 'elysia';

// Frames the client sends over the WebSocket. One discriminated union keyed by `type`.
export const RoomSubscribe = t.Object({ type: t.Literal('room.subscribe'), roomId: t.String() });
export const RoomUnsubscribe = t.Object({ type: t.Literal('room.unsubscribe'), roomId: t.String() });
export const MessageSend = t.Object({
  type: t.Literal('message.send'),
  roomId: t.String(),
  clientMsgId: t.String({ format: 'uuid' }),
  body: t.String({ minLength: 1, maxLength: 4000 }),
});
export const SyncRequest = t.Object({
  type: t.Literal('sync'),
  roomId: t.String(),
  afterSeq: t.Integer({ minimum: 0 }),
});
export const TypingRequest = t.Object({ type: t.Literal('typing'), roomId: t.String() });
export const ReadRequest = t.Object({
  type: t.Literal('read'),
  roomId: t.String(),
  seq: t.Integer({ minimum: 0 }),
});
// Presence is per user, not per room, so a heartbeat carries no roomId.
export const HeartbeatRequest = t.Object({ type: t.Literal('heartbeat') });

export const ClientEvent = t.Union([
  RoomSubscribe, RoomUnsubscribe, MessageSend, SyncRequest, TypingRequest, ReadRequest, HeartbeatRequest,
]);
export type ClientEventType = typeof ClientEvent.static;
