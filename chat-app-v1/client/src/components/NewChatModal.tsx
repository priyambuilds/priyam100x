import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useChat } from '../state/ChatProvider'
import type { User } from '../types'
import { Avatar } from './Avatar'

export function NewChatModal({ onClose, onOpened }: { onClose: () => void; onOpened: () => void }) {
  const { refreshRooms, openRoom } = useChat()
  const [tab, setTab] = useState<'dm' | 'group'>('dm')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [picked, setPicked] = useState<User[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const t = setTimeout(() => api.searchUsers(q).then(setResults).catch(() => setResults([])), 250) // debounce
    return () => clearTimeout(t)
  }, [query])

  async function finish(roomId: string) {
    await refreshRooms()
    await openRoom(roomId)
    onOpened()
    onClose()
  }

  async function startDm(user: User) {
    try { await finish((await api.startDm(user.id)).id) } catch (e) { setError((e as Error).message) }
  }

  async function createGroup() {
    try { await finish((await api.createGroup(name.trim(), picked.map((u) => u.id))).id) } catch (e) { setError((e as Error).message) }
  }

  const toggle = (u: User) => setPicked((p) => p.some((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u])

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="New chat" className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 rounded-lg bg-slate-800 p-1 text-sm">
          {(['dm', 'group'] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(null) }} className={`flex-1 rounded-md py-1.5 ${tab === t ? 'bg-slate-700 font-medium' : 'text-slate-400'}`}>
              {t === 'dm' ? 'Direct message' : 'New group'}
            </button>
          ))}
        </div>

        {tab === 'group' && (
          <input className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        )}
        <input autoFocus className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Search people by username" value={query} onChange={(e) => setQuery(e.target.value)} />

        {tab === 'group' && picked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {picked.map((u) => (
              <button key={u.id} onClick={() => toggle(u)} className="rounded-full bg-indigo-600/30 px-3 py-1 text-xs text-indigo-200 hover:bg-indigo-600/50">{u.username} ✕</button>
            ))}
          </div>
        )}

        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {(query.trim() ? results : []).map((u) => (
            <li key={u.id}>
              <button onClick={() => tab === 'dm' ? void startDm(u) : toggle(u)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-800">
                <Avatar name={u.username} size="sm" />
                <span className="flex-1 text-sm">{u.username}</span>
                {tab === 'group' && picked.some((x) => x.id === u.id) && <span className="text-emerald-400">✓</span>}
              </button>
            </li>
          ))}
          {query.trim() && results.length === 0 && <li className="p-2 text-sm text-slate-500">No users found</li>}
        </ul>

        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
          {tab === 'group' && (
            <button disabled={!name.trim()} onClick={() => void createGroup()} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40">Create group</button>
          )}
        </div>
      </div>
    </div>
  )
}
