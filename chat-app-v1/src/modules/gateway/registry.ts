// The minimal socket surface the gateway needs (keeps it testable and decoupled from Elysia types).
export type Socket = {
    id: string;
    send(data: unknown): unknown;
    close(code?: number, reason?: string): void;
    subscribe(topic: string): unknown;
    unsubscribe(topic: string): unknown;
};

export type Connection = {
    ws: Socket;
    userId: string;
    /** JWT expiry, unix seconds. The socket is closed 4001 after this. */
    exp: number;
    rooms: Set<string>;
    rateLimitStrikes: number;
    /** Tail of this socket's event queue (see gateway: events run one at a time, in order). */
    queue: Promise<void>;
};

// Per-instance, in-memory view of who is connected here. Nothing in it needs to
// survive a restart: clients reconnect elsewhere and resync from Postgres.
export class ConnectionRegistry {
    private conns = new Map<string, Connection>();
    private byUser = new Map<string, Set<string>>();

    add(ws: Socket, userId: string, exp: number) {
        const conn: Connection = { ws, userId, exp, rooms: new Set(), rateLimitStrikes: 0, queue: Promise.resolve() };
        this.conns.set(ws.id, conn);
        const ids = this.byUser.get(userId) ?? new Set();
        ids.add(ws.id);
        this.byUser.set(userId, ids);
        return conn;
    }

    get(id: string) { return this.conns.get(id); }

    remove(id: string) {
        const conn = this.conns.get(id);
        if (!conn) return undefined;
        this.conns.delete(id);
        const ids = this.byUser.get(conn.userId);
        ids?.delete(id);
        if (ids?.size === 0) this.byUser.delete(conn.userId);
        return conn;
    }

    forUser(userId: string): Connection[] {
        return [...(this.byUser.get(userId) ?? [])].map((id) => this.conns.get(id)!).filter(Boolean);
    }

    all(): Connection[] { return [...this.conns.values()]; }
    get size() { return this.conns.size; }
}
