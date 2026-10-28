import type { ClientFrame, ServerEvent } from '../types'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

type Options = {
  getTicket: () => Promise<string>
  onEvent: (e: ServerEvent) => void
  onStatus: (s: ConnectionStatus) => void
  /** Token expired (close 4001) or ticket could not be issued (401). */
  onAuthLost: () => void
}

const HEARTBEAT_MS = 25_000

/**
 * One WebSocket with the reconnect behaviour from docs/PROTOCOL.md:
 * fresh ticket per connect, full-jitter exponential backoff, heartbeat.
 * What to do *after* (re)connecting (subscribe, sync, resend) is the app's job.
 */
export class ChatClient {
  private ws: WebSocket | null = null
  private attempt = 0
  private stopped = false
  private heartbeat?: ReturnType<typeof setInterval>
  private retry?: ReturnType<typeof setTimeout>

  private opts: Options
  constructor(opts: Options) { this.opts = opts }

  start() {
    this.stopped = false
    void this.connect()
  }

  stop() {
    this.stopped = true
    clearTimeout(this.retry)
    clearInterval(this.heartbeat)
    this.ws?.close()
    this.ws = null
  }

  /** Returns false if the frame couldn't be sent (offline). */
  send(frame: ClientFrame): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(frame))
    return true
  }

  private async connect() {
    this.opts.onStatus('connecting')
    let ticket: string
    try {
      ticket = await this.opts.getTicket()
    } catch (err) {
      if ((err as { status?: number }).status === 401) return this.opts.onAuthLost()
      return this.scheduleRetry()
    }
    if (this.stopped) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws?ticket=${encodeURIComponent(ticket)}`)
    this.ws = ws

    ws.onopen = () => {
      this.attempt = 0
      this.opts.onStatus('online')
      clearInterval(this.heartbeat)
      this.heartbeat = setInterval(() => this.send({ type: 'heartbeat' }), HEARTBEAT_MS)
    }
    ws.onmessage = (e) => {
      try { this.opts.onEvent(JSON.parse(e.data)) } catch { /* ignore non-JSON frames */ }
    }
    ws.onclose = (e) => {
      clearInterval(this.heartbeat)
      if (this.ws === ws) this.ws = null
      if (this.stopped) return
      this.opts.onStatus('offline')
      if (e.code === 4001) return this.opts.onAuthLost()
      this.scheduleRetry()
    }
  }

  private scheduleRetry() {
    if (this.stopped) return
    // Full jitter: random(0, min(30s, 500ms * 2^attempt)), so a restarted server
    // isn't hit by every client in the same instant.
    const cap = Math.min(30_000, 500 * 2 ** this.attempt++)
    this.retry = setTimeout(() => void this.connect(), Math.random() * cap)
  }
}
