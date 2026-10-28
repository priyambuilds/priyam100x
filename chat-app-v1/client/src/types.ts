export type User = { id: string; username: string }

export type Message = {
  id: string
  roomId: string
  seq: number
  senderId: string
  clientMsgId: string
  body: string
  createdAt: string
}

/** A message the user sent that the server hasn't acked yet. */
export type PendingMessage = {
  clientMsgId: string
  roomId: string
  body: string
  createdAt: string
  failed?: string
}

export type RoomSummary = {
  id: string
  kind: 'DIRECT' | 'GROUP'
  name: string | null
  peer: User | null
  memberCount: number
  lastSeq: number
  lastReadSeq: number
  unreadCount: number
  lastMessage: Message | null
}

export type Member = {
  userId: string
  username: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  lastReadSeq: number
  online: boolean
}

export type RoomDetails = {
  id: string
  kind: 'DIRECT' | 'GROUP'
  name: string | null
  lastSeq: number
  members: Member[]
}

// Mirrors docs/PROTOCOL.md (server -> client)
export type ServerEvent =
  | { type: 'connected'; userId: string; connectionId: string }
  | { type: 'room.subscribed'; roomId: string }
  | { type: 'message.ack'; clientMsgId: string; id: string; seq: number; createdAt: string }
  | { type: 'message.new'; message: Message }
  | { type: 'sync.result'; roomId: string; messages: Message[]; hasMore: boolean }
  | { type: 'typing'; roomId: string; userId: string }
  | { type: 'read.update'; roomId: string; userId: string; seq: number }
  | { type: 'presence.update'; userId: string; online: boolean }
  | { type: 'room.added'; roomId: string }
  | { type: 'room.removed'; roomId: string }
  | { type: 'error'; code: string; message?: string; clientMsgId?: string }

export type ClientFrame =
  | { type: 'room.subscribe'; roomId: string }
  | { type: 'room.unsubscribe'; roomId: string }
  | { type: 'message.send'; roomId: string; clientMsgId: string; body: string }
  | { type: 'sync'; roomId: string; afterSeq: number }
  | { type: 'typing'; roomId: string }
  | { type: 'read'; roomId: string; seq: number }
  | { type: 'heartbeat' }
