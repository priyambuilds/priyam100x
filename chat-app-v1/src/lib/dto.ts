import type { Message } from "../../generated/prisma/client";

// What clients see. Never leak raw rows (and never passwordHash).
export const toMessageDTO = (m: Message) => ({
  id: m.id,
  roomId: m.roomId,
  seq: m.seq,
  senderId: m.senderId,
  clientMsgId: m.clientMsgId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});
export type MessageDTO = ReturnType<typeof toMessageDTO>;
