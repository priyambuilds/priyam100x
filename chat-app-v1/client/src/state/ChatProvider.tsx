/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { api, setToken, setUnauthorizedHandler } from '../lib/api'
import { ChatClient } from '../lib/chat-client'
import { uuid } from '../lib/format'
import type { ClientFrame, ServerEvent, User } from '../types'
import { initialState, reducer, type State } from './reducer'

const TOKEN_KEY = 'chat.token'
const TYPING_TTL_MS = 4000

type ChatApi = {
  state: State
  login: (mode: 'login' | 'register', username: string, password: string) => Promise<void>
  logout: () => void
  openRoom: (roomId: string) => Promise<void>
  loadOlder: (roomId: string) => Promise<void>
  sendMessage: (roomId: string, body: string) => void
  retry: (clientMsgId: string) => void
  sendTyping: (roomId: string) => void
  refreshRooms: () => Promise<void>
  leaveRoom: (roomId: string) => Promise<void>
  dismissNotice: () => void
}

const Ctx = createContext<ChatApi | null>(null)
export const useChat = () => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useChat outside ChatProvider')
  return v
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  // Socket callbacks outlive renders, so they read the latest state through a ref.
  const stateRef = useRef(state)
  useLayoutEffect(() => { stateRef.current = state })
  const client = useRef<ChatClient | null>(null)
  const send = useCallback((f: ClientFrame) => client.current?.send(f) ?? false, [])

  const lastSeqOf = (roomId: string) => {
    const msgs = stateRef.current.loaded[roomId]?.messages
    return msgs?.length ? msgs[msgs.length - 1]!.seq : 0
  }

  const logout = useCallback(() => {
    client.current?.stop()
    client.current = null
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    dispatch({ type: 'reset' })
  }, [])

  const refreshRooms = useCallback(async () => {
    const rooms = await api.rooms()
    dispatch({ type: 'rooms', rooms })
    // Anything new needs a subscription (no-op server-side if already joined).
    rooms.forEach((r) => send({ type: 'room.subscribe', roomId: r.id }))
  }, [send])

  // --- server events -------------------------------------------------------
  const handleEvent = useCallback((e: ServerEvent) => {
    const s = stateRef.current
    switch (e.type) {
      case 'connected':
        // (Re)connect recipe: subscribe first, sync after `room.subscribed`, then resend pending.
        Object.keys(s.rooms).forEach((roomId) => send({ type: 'room.subscribe', roomId }))
        s.pending.filter((p) => !p.failed).forEach((p) =>
          send({ type: 'message.send', roomId: p.roomId, clientMsgId: p.clientMsgId, body: p.body }))
        break

      case 'room.subscribed':
        if (s.loaded[e.roomId]) send({ type: 'sync', roomId: e.roomId, afterSeq: lastSeqOf(e.roomId) })
        break

      case 'sync.result':
        dispatch({ type: 'messages', roomId: e.roomId, messages: e.messages })
        if (e.hasMore && e.messages.length) {
          send({ type: 'sync', roomId: e.roomId, afterSeq: e.messages[e.messages.length - 1]!.seq })
        }
        break

      case 'message.ack':
        dispatch({ type: 'pending/ack', clientMsgId: e.clientMsgId, id: e.id, seq: e.seq, createdAt: e.createdAt })
        break

      case 'message.new': {
        const m = e.message
        const loadedLast = s.loaded[m.roomId]?.messages.at(-1)?.seq
        if (loadedLast !== undefined && m.seq > loadedLast + 1) {
          send({ type: 'sync', roomId: m.roomId, afterSeq: loadedLast }) // seq jump = gap
        }
        const watching = s.activeRoomId === m.roomId && document.visibilityState === 'visible'
        dispatch({ type: 'received', message: m, countUnread: m.senderId !== s.me?.id && !watching })
        // A sender we have never seen (new group member): refresh the member list.
        if (s.members[m.roomId] && !s.members[m.roomId]!.some((x) => x.userId === m.senderId)) {
          void api.room(m.roomId).then((room) => dispatch({ type: 'details', room }))
        }
        break
      }

      case 'typing':
        if (e.userId !== s.me?.id) dispatch({ type: 'typing', roomId: e.roomId, userId: e.userId, until: Date.now() + TYPING_TTL_MS })
        break

      case 'read.update': dispatch({ type: 'read/remote', roomId: e.roomId, userId: e.userId, seq: e.seq }); break
      case 'presence.update': dispatch({ type: 'presence', userId: e.userId, online: e.online }); break
      case 'room.added': void refreshRooms(); break
      case 'room.removed': dispatch({ type: 'room/remove', roomId: e.roomId }); break

      case 'error':
        if (e.clientMsgId) dispatch({ type: 'pending/fail', clientMsgId: e.clientMsgId, reason: e.message ?? e.code })
        else dispatch({ type: 'notice', notice: e.message ?? e.code })
        break
    }
  }, [send, refreshRooms])

  // --- session bootstrap ---------------------------------------------------
  const start = useCallback(async (user: User) => {
    dispatch({ type: 'me', me: user })
    await refreshRooms().catch(() => {})
    client.current?.stop()
    client.current = new ChatClient({
      getTicket: api.ticket,
      onEvent: handleEvent,
      onStatus: (status) => dispatch({ type: 'status', status }),
      onAuthLost: logout,
    })
    client.current.start()
  }, [handleEvent, logout, refreshRooms])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    const saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) return
    setToken(saved)
    api.me().then(start).catch(() => logout())
    return () => client.current?.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (mode: 'login' | 'register', username: string, password: string) => {
    const { token, user } = await (mode === 'login' ? api.login : api.register)(username, password)
    setToken(token)
    localStorage.setItem(TOKEN_KEY, token)
    await start(user)
  }, [start])

  // --- actions -------------------------------------------------------------
  const openRoom = useCallback(async (roomId: string) => {
    dispatch({ type: 'active', roomId })
    const [details, history] = await Promise.all([
      api.room(roomId),
      stateRef.current.loaded[roomId] ? null : api.history(roomId),
    ])
    dispatch({ type: 'details', room: details })
    if (history) {
      dispatch({ type: 'messages', roomId, messages: history.messages, hasMoreOlder: history.hasMore })
      // Close the window between the history query and now.
      send({ type: 'sync', roomId, afterSeq: Math.max(0, ...history.messages.map((m) => m.seq)) })
    }
  }, [send])

  const loadOlder = useCallback(async (roomId: string) => {
    const first = stateRef.current.loaded[roomId]?.messages[0]
    if (!first) return
    const page = await api.history(roomId, first.seq)
    dispatch({ type: 'messages', roomId, messages: page.messages, hasMoreOlder: page.hasMore })
  }, [])

  const sendMessage = useCallback((roomId: string, body: string) => {
    const clientMsgId = uuid()
    dispatch({ type: 'pending/add', pending: { clientMsgId, roomId, body, createdAt: new Date().toISOString() } })
    send({ type: 'message.send', roomId, clientMsgId, body }) // if offline it stays pending and is resent on reconnect
  }, [send])

  const retry = useCallback((clientMsgId: string) => {
    const p = stateRef.current.pending.find((x) => x.clientMsgId === clientMsgId)
    if (!p) return
    dispatch({ type: 'pending/retry', clientMsgId })
    send({ type: 'message.send', roomId: p.roomId, clientMsgId, body: p.body })
  }, [send])

  const lastTyping = useRef(0)
  const sendTyping = useCallback((roomId: string) => {
    if (Date.now() - lastTyping.current < 2500) return
    lastTyping.current = Date.now()
    send({ type: 'typing', roomId })
  }, [send])

  const leaveRoom = useCallback(async (roomId: string) => {
    await api.leave(roomId, stateRef.current.me!.id)
    dispatch({ type: 'room/remove', roomId })
  }, [])

  const dismissNotice = useCallback(() => dispatch({ type: 'notice', notice: null }), [])

  // Mark the open room as read whenever new messages land while the tab is visible.
  const activeLast = state.activeRoomId ? state.loaded[state.activeRoomId]?.messages.at(-1)?.seq : undefined
  const activeRead = state.activeRoomId ? state.rooms[state.activeRoomId]?.lastReadSeq : undefined
  useEffect(() => {
    const roomId = state.activeRoomId
    if (!roomId || activeLast === undefined || activeRead === undefined || activeLast <= activeRead) return
    const mark = () => {
      if (document.visibilityState !== 'visible') return
      send({ type: 'read', roomId, seq: activeLast })
      dispatch({ type: 'read/local', roomId, seq: activeLast })
    }
    mark()
    document.addEventListener('visibilitychange', mark)
    return () => document.removeEventListener('visibilitychange', mark)
  }, [state.activeRoomId, activeLast, activeRead, send])

  const value = useMemo(
    () => ({ state, login, logout, openRoom, loadOlder, sendMessage, retry, sendTyping, refreshRooms, leaveRoom, dismissNotice }),
    [state, login, logout, openRoom, loadOlder, sendMessage, retry, sendTyping, refreshRooms, leaveRoom, dismissNotice],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

