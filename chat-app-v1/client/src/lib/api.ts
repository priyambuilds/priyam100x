import type { Message, RoomDetails, RoomSummary, User } from '../types'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let token: string | null = null
let onUnauthorized: () => void = () => {}
export const setToken = (t: string | null) => { token = t }
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // A 401 on an authenticated call means the JWT expired: bounce to login.
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? res.statusText)
  }
  return data as T
}

export type AuthResult = { token: string; user: User }

export const api = {
  register: (username: string, password: string) => request<AuthResult>('POST', '/auth/register', { username, password }),
  login: (username: string, password: string) => request<AuthResult>('POST', '/auth/login', { username, password }),
  me: () => request<User>('GET', '/me'),
  ticket: () => request<{ ticket: string }>('POST', '/ws/ticket').then((r) => r.ticket),
  rooms: () => request<RoomSummary[]>('GET', '/rooms'),
  room: (id: string) => request<RoomDetails>('GET', `/rooms/${id}`),
  history: (id: string, before?: number) =>
    request<{ messages: Message[]; hasMore: boolean }>('GET', `/rooms/${id}/messages?limit=50${before ? `&before=${before}` : ''}`),
  searchUsers: (q: string) => request<User[]>('GET', `/users?q=${encodeURIComponent(q)}`),
  startDm: (userId: string) => request<{ id: string }>('POST', '/rooms/dm', { userId }),
  createGroup: (name: string, memberIds: string[]) => request<{ id: string }>('POST', '/rooms', { name, memberIds }),
  leave: (roomId: string, userId: string) => request<unknown>('DELETE', `/rooms/${roomId}/members/${userId}`),
}
