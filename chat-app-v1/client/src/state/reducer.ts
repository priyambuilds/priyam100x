import type { ConnectionStatus } from '../lib/chat-client'
import type { Member, Message, PendingMessage, RoomDetails, RoomSummary, User } from '../types'

export type Loaded = { messages: Message[]; hasMoreOlder: boolean }

export type State = {
  me: User | null
  status: ConnectionStatus
  rooms: Record<string, RoomSummary>
  roomsLoaded: boolean
  loaded: Record<string, Loaded>
  pending: PendingMessage[]
  members: Record<string, Member[]>
  presence: Record<string, boolean>
  /** roomId -> userId -> time (ms) the indicator expires */
  typing: Record<string, Record<string, number>>
  activeRoomId: string | null
  notice: string | null
}

export const initialState: State = {
  me: null, status: 'offline', rooms: {}, roomsLoaded: false, loaded: {}, pending: [],
  members: {}, presence: {}, typing: {}, activeRoomId: null, notice: null,
}

export type Action =
  | { type: 'me'; me: User | null }
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'rooms'; rooms: RoomSummary[] }
  | { type: 'room/remove'; roomId: string }
  | { type: 'active'; roomId: string | null }
  | { type: 'messages'; roomId: string; messages: Message[]; hasMoreOlder?: boolean }
  | { type: 'received'; message: Message; countUnread: boolean }
  | { type: 'details'; room: RoomDetails }
  | { type: 'read/local'; roomId: string; seq: number }
  | { type: 'read/remote'; roomId: string; userId: string; seq: number }
  | { type: 'presence'; userId: string; online: boolean }
  | { type: 'typing'; roomId: string; userId: string; until: number }
  | { type: 'pending/add'; pending: PendingMessage }
  | { type: 'pending/fail'; clientMsgId: string; reason: string }
  | { type: 'pending/retry'; clientMsgId: string }
  | { type: 'pending/ack'; clientMsgId: string; id: string; seq: number; createdAt: string }
  | { type: 'notice'; notice: string | null }
  | { type: 'reset' }

/** Dedupe by id, order by seq. Safe to call with overlapping data (sync + live). */
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map(existing.map((m) => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => a.seq - b.seq)
}

const withLast = (room: RoomSummary, m: Message): RoomSummary => ({
  ...room,
  lastSeq: Math.max(room.lastSeq, m.seq),
  lastMessage: !room.lastMessage || m.seq >= room.lastMessage.seq ? m : room.lastMessage,
})

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset': return initialState
    case 'me': return { ...state, me: action.me }
    case 'status': return { ...state, status: action.status }
    case 'notice': return { ...state, notice: action.notice }
    case 'active': return { ...state, activeRoomId: action.roomId }

    case 'rooms':
      return { ...state, roomsLoaded: true, rooms: Object.fromEntries(action.rooms.map((r) => [r.id, r])) }

    case 'room/remove': {
      const rooms = { ...state.rooms }
      const loaded = { ...state.loaded }
      delete rooms[action.roomId]
      delete loaded[action.roomId]
      return { ...state, rooms, loaded, activeRoomId: state.activeRoomId === action.roomId ? null : state.activeRoomId }
    }

    case 'messages': {
      const prev = state.loaded[action.roomId]
      const room = state.rooms[action.roomId]
      const merged = mergeMessages(prev?.messages ?? [], action.messages)
      const last = merged[merged.length - 1]
      return {
        ...state,
        loaded: {
          ...state.loaded,
          [action.roomId]: { messages: merged, hasMoreOlder: action.hasMoreOlder ?? prev?.hasMoreOlder ?? false },
        },
        rooms: room && last ? { ...state.rooms, [room.id]: withLast(room, last) } : state.rooms,
      }
    }

    case 'received': {
      const m = action.message
      const room = state.rooms[m.roomId]
      const prev = state.loaded[m.roomId]
      return {
        ...state,
        loaded: prev ? { ...state.loaded, [m.roomId]: { ...prev, messages: mergeMessages(prev.messages, [m]) } } : state.loaded,
        rooms: room
          ? { ...state.rooms, [room.id]: { ...withLast(room, m), unreadCount: room.unreadCount + (action.countUnread ? 1 : 0) } }
          : state.rooms,
        // The real message supersedes its optimistic copy.
        pending: state.pending.filter((p) => p.clientMsgId !== m.clientMsgId),
        // Sending a message ends "is typing".
        typing: state.typing[m.roomId]
          ? { ...state.typing, [m.roomId]: { ...state.typing[m.roomId], [m.senderId]: 0 } }
          : state.typing,
      }
    }

    case 'details':
      return {
        ...state,
        members: { ...state.members, [action.room.id]: action.room.members },
        presence: { ...state.presence, ...Object.fromEntries(action.room.members.map((m) => [m.userId, m.online])) },
      }

    case 'read/local': {
      const room = state.rooms[action.roomId]
      if (!room || room.lastReadSeq >= action.seq) return state
      return { ...state, rooms: { ...state.rooms, [room.id]: { ...room, lastReadSeq: action.seq, unreadCount: Math.max(0, room.lastSeq - action.seq) } } }
    }

    case 'read/remote': {
      const members = state.members[action.roomId]
      if (!members) return state
      return {
        ...state,
        members: { ...state.members, [action.roomId]: members.map((m) => m.userId === action.userId ? { ...m, lastReadSeq: Math.max(m.lastReadSeq, action.seq) } : m) },
      }
    }

    case 'presence': return { ...state, presence: { ...state.presence, [action.userId]: action.online } }

    case 'typing':
      return { ...state, typing: { ...state.typing, [action.roomId]: { ...state.typing[action.roomId], [action.userId]: action.until } } }

    case 'pending/add': return { ...state, pending: [...state.pending, action.pending] }
    case 'pending/fail':
      return { ...state, pending: state.pending.map((p) => p.clientMsgId === action.clientMsgId ? { ...p, failed: action.reason } : p) }
    case 'pending/retry':
      return { ...state, pending: state.pending.map((p) => p.clientMsgId === action.clientMsgId ? { ...p, failed: undefined } : p) }

    case 'pending/ack': {
      // Show the confirmed message now; the broadcast `message.new` dedupes onto it by id.
      const p = state.pending.find((x) => x.clientMsgId === action.clientMsgId)
      if (!p || !state.me) return state
      const message: Message = {
        id: action.id, roomId: p.roomId, seq: action.seq, senderId: state.me.id,
        clientMsgId: p.clientMsgId, body: p.body, createdAt: action.createdAt,
      }
      return reducer({ ...state, pending: state.pending.filter((x) => x !== p) }, { type: 'received', message, countUnread: false })
    }
  }
}
