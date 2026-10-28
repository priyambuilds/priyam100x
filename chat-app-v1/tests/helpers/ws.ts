export type Event = Record<string, any>;

export type TestSocket = ReturnType<typeof connectWs>;

/** WebSocket wrapper: await events instead of sleeping. */
export function connectWs(url: string) {
  const ws = new WebSocket(url);
  const inbox: Event[] = [];
  const waiters: Array<() => void> = [];
  ws.onmessage = (e) => { inbox.push(JSON.parse(e.data)); waiters.splice(0).forEach((w) => w()); };

  const opened = new Promise<void>((res, rej) => {
    ws.onopen = () => res();
    ws.onerror = () => rej(new Error("upgrade rejected"));
  });
  const closed = new Promise<{ code: number; reason: string }>((res) => {
    ws.onclose = (e) => res({ code: e.code, reason: e.reason });
  });

  async function next(pred: (e: Event) => boolean, timeoutMs = 3000): Promise<Event> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0]!;
      const left = deadline - Date.now();
      if (left <= 0) throw new Error("timed out waiting for event");
      await new Promise<void>((res) => { waiters.push(res); setTimeout(res, left); });
    }
  }
  const nextType = (type: string, timeoutMs?: number) => next((e) => e.type === type, timeoutMs);

  /** Assert nothing matching arrives within `ms`. */
  async function expectNone(pred: (e: Event) => boolean, ms = 300) {
    await Bun.sleep(ms);
    if (inbox.some(pred)) throw new Error("received an event that should not have arrived");
  }

  return {
    ws, opened, closed, inbox, next, nextType, expectNone,
    send: (e: Event) => ws.send(JSON.stringify(e)),
    close: () => ws.close(),
  };
}
