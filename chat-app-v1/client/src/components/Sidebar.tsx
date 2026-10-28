import { useMemo } from 'react'
import { roomTitle, clock } from '../lib/format'
import { useChat } from '../state/ChatProvider'
import { Avatar } from './Avatar'

export function Sidebar({ onNewChat, onSelect }: { onNewChat: () => void; onSelect: () => void }) {
  const { state, openRoom, logout } = useChat()
  const { rooms, presence, activeRoomId, me, status } = state

  const sorted = useMemo(
    () => Object.values(rooms).sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? '')),
    [rooms],
  )

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900 md:w-80">
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{me?.username}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-emerald-400' : status === 'connecting' ? 'bg-amber-400' : 'bg-rose-500'}`} />
            {status === 'online' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Offline, retrying…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNewChat} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500">New</button>
          <button onClick={logout} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">Log out</button>
        </div>
      </header>

      <ul className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <li className="p-6 text-center text-sm text-slate-500">{state.roomsLoaded ? 'No conversations yet. Press New to start one.' : 'Loading…'}</li>
        )}
        {sorted.map((r) => {
          const title = roomTitle(r)
          const active = r.id === activeRoomId
          return (
            <li key={r.id}>
              <button onClick={() => { void openRoom(r.id); onSelect() }} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 ${active ? 'bg-slate-800' : ''}`}>
                <Avatar name={title} online={r.peer ? presence[r.peer.id] ?? false : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{title}</span>
                    {r.lastMessage && <span className="shrink-0 text-xs text-slate-500">{clock(r.lastMessage.createdAt)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-400">{r.lastMessage?.body ?? 'No messages yet'}</span>
                    {r.unreadCount > 0 && !active && (
                      <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold">{r.unreadCount > 99 ? '99+' : r.unreadCount}</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
