import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { clock, dayLabel, roomTitle, useNow } from '../lib/format'
import { useChat } from '../state/ChatProvider'
import { Avatar } from './Avatar'

export function ChatPane({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const { state, loadOlder, sendMessage, retry, sendTyping, leaveRoom } = useChat()
  const { me, rooms, loaded, pending, members, presence, typing } = state
  const room = rooms[roomId]
  const roomMembers = useMemo(() => members[roomId] ?? [], [members, roomId])
  const now = useNow()

  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const prevHeight = useRef(0)

  const names = useMemo(() => new Map(roomMembers.map((m) => [m.userId, m.username])), [roomMembers])
  const messages = loaded[roomId]?.messages ?? []
  const mine = pending.filter((p) => p.roomId === roomId)

  // Peers who have read up to which seq (for "Seen" under my last message).
  const seenBy = (seq: number) => roomMembers.filter((m) => m.userId !== me?.id && m.lastReadSeq >= seq)
  const myLastSeq = [...messages].reverse().find((m) => m.senderId === me?.id)?.seq

  const typers = Object.entries(typing[roomId] ?? {})
    .filter(([id, until]) => until > now && id !== me?.id)
    .map(([id]) => names.get(id) ?? 'Someone')

  // Keep the view pinned to the newest message, unless the user scrolled up;
  // after loading older history, keep the scroll position instead of jumping.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (prevHeight.current && !stickToBottom.current) el.scrollTop += el.scrollHeight - prevHeight.current
    else if (stickToBottom.current) el.scrollTop = el.scrollHeight
    prevHeight.current = 0
  }, [messages.length, mine.length, typers.length])

  useEffect(() => { stickToBottom.current = true }, [roomId])

  if (!room) return null
  const title = roomTitle(room)
  const online = room.peer ? presence[room.peer.id] ?? false : undefined
  const onlineCount = roomMembers.filter((m) => presence[m.userId]).length

  function submit() {
    const body = text.trim()
    if (!body) return
    stickToBottom.current = true
    sendMessage(roomId, body)
    setText('')
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white md:hidden" aria-label="Back">←</button>
        <Avatar name={title} online={online} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-xs text-slate-400">
            {room.kind === 'DIRECT' ? (online ? 'Online' : 'Offline') : `${roomMembers.length || room.memberCount} members · ${onlineCount} online`}
          </p>
        </div>
        {room.kind === 'GROUP' && (
          <button onClick={() => { if (confirm('Leave this group?')) void leaveRoom(roomId) }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Leave</button>
        )}
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
      >
        {loaded[roomId]?.hasMoreOlder && (
          <div className="pb-2 text-center">
            <button
              onClick={() => { prevHeight.current = listRef.current?.scrollHeight ?? 0; stickToBottom.current = false; void loadOlder(roomId) }}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >Load older messages</button>
          </div>
        )}
        {!loaded[roomId] && <p className="py-10 text-center text-sm text-slate-500">Loading…</p>}
        {loaded[roomId] && messages.length === 0 && mine.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No messages yet. Say hi 👋</p>
        )}

        {messages.map((m, i) => {
          const isMe = m.senderId === me?.id
          const prev = messages[i - 1]
          const day = dayLabel(m.createdAt)
          const showDay = !prev || dayLabel(prev.createdAt) !== day
          const showName = room.kind === 'GROUP' && !isMe && (!prev || prev.senderId !== m.senderId || showDay)
          const seen = isMe && m.seq === myLastSeq ? seenBy(m.seq) : []
          return (
            <div key={m.id}>
              {showDay && <p className="py-3 text-center text-xs text-slate-500">{day}</p>}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isMe ? 'rounded-br-md bg-indigo-600' : 'rounded-bl-md bg-slate-800'}`}>
                  {showName && <p className="mb-0.5 text-xs font-medium text-indigo-300">{names.get(m.senderId) ?? '…'}</p>}
                  <p className="break-words whitespace-pre-wrap text-sm">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-500'}`}>{clock(m.createdAt)}</p>
                </div>
              </div>
              {seen.length > 0 && (
                <p className="pr-1 text-right text-[10px] text-slate-500">
                  Seen{room.kind === 'GROUP' ? ` by ${seen.length}` : ''}
                </p>
              )}
            </div>
          )
        })}

        {mine.map((p) => (
          <div key={p.clientMsgId} className="flex justify-end">
            <div className={`max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2 ${p.failed ? 'bg-rose-900/60' : 'bg-indigo-600/50'}`}>
              <p className="break-words whitespace-pre-wrap text-sm">{p.body}</p>
              <p className="mt-0.5 text-right text-[10px] text-indigo-200">
                {p.failed ? (
                  <>Failed: {p.failed} · <button className="underline" onClick={() => retry(p.clientMsgId)}>Retry</button></>
                ) : 'Sending…'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="h-5 px-5 text-xs text-slate-400">
        {typers.length > 0 && `${typers.join(', ')} ${typers.length > 1 ? 'are' : 'is'} typing…`}
      </div>
      <div className="flex items-end gap-2 border-t border-slate-800 bg-slate-900 p-3">
        <textarea
          rows={1}
          value={text}
          maxLength={4000}
          placeholder="Message…  (Enter to send, Shift+Enter for a new line)"
          onChange={(e) => { setText(e.target.value); if (e.target.value) sendTyping(roomId) }}
          onKeyDown={onKey}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <button onClick={submit} disabled={!text.trim()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40">Send</button>
      </div>
    </section>
  )
}
