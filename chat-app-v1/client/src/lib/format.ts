import { useEffect, useState } from 'react'
import type { RoomSummary } from '../types'

export const roomTitle = (r: RoomSummary) => r.name ?? (r.kind === 'DIRECT' ? 'Direct message' : 'Untitled')

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86_400_000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Re-render every `ms` (used to expire typing indicators). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/**
 * UUID v4 that also works over plain http on a LAN: `crypto.randomUUID` only
 * exists in secure contexts (https or localhost), `getRandomValues` does not.
 */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
