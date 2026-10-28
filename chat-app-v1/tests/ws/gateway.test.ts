import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createHarness, type Harness, type Session } from "../helpers/harness";
import { connectWs } from "../helpers/ws";

let h: Harness;
let alice: Session, bob: Session, mallory: Session;
let room: string;

beforeAll(async () => {
  h = await createHarness({ instances: 2, config: { messageRateLimit: { max: 1000, windowSeconds: 10 } } });
  [alice, bob, mallory] = await Promise.all([h.register("alice"), h.register("bob"), h.register("mallory")]) as [Session, Session, Session];
  room = await h.group(alice, [bob]);
});
afterAll(() => h.cleanup());

const url = (i: number, ticket: string, extra = "") => `ws://localhost:${h.instances[i]!.server.port}/ws?ticket=${ticket}${extra}`;
const sendMsg = (sock: { send: (e: any) => void }, body: string, roomId = room, clientMsgId = crypto.randomUUID()) => {
  sock.send({ type: "message.send", roomId, clientMsgId, body });
  return clientMsgId;
};

describe("upgrade / auth", () => {
  test("connects with a ticket and says who you are", async () => {
    const s = connectWs(url(0, await h.ticket(0, alice)));
    await s.opened;
    const hello = await s.nextType("connected");
    expect(hello.userId).toBe(alice.id);
    s.close();
  });

  test("missing, bogus, and reused tickets never get a socket", async () => {
    await expect(connectWs(`ws://localhost:${h.instances[0]!.server.port}/ws`).opened).rejects.toThrow();
    await expect(connectWs(url(0, "bogus")).opened).rejects.toThrow();

    const t = await h.ticket(0, alice);
    const first = connectWs(url(0, t)); await first.opened;
    await expect(connectWs(url(1, t)).opened).rejects.toThrow(); // reuse, even on another instance
    first.close();
  });

  test("two sockets racing for one ticket: exactly one wins", async () => {
    const t = await h.ticket(0, alice);
    const results = await Promise.allSettled([connectWs(url(0, t)).opened, connectWs(url(1, t)).opened]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  test("a ticket from a browser with a disallowed Origin is refused", async () => {
    const strict = await createHarness({ instances: 1, config: { allowedOrigins: ["https://chat.example"] } });
    const s = await strict.register("origin");
    const t = await strict.ticket(0, s);
    const wsUrl = `ws://localhost:${strict.instances[0]!.server.port}/ws?ticket=`;
    // Bun's WebSocket lets us set headers.
    const bad = new WebSocket(wsUrl + t, { headers: { Origin: "https://evil.example" } } as any);
    await expect(new Promise((res, rej) => { bad.onopen = res; bad.onerror = () => rej(new Error("rejected")); })).rejects.toThrow();
    const good = new WebSocket(wsUrl + await strict.ticket(0, s), { headers: { Origin: "https://chat.example" } } as any);
    await new Promise((res, rej) => { good.onopen = res; good.onerror = () => rej(new Error("rejected")); });
    good.close();
    await strict.cleanup();
  });

  test("a socket is closed 4001 once its JWT has expired", async () => {
    const s = await h.connect(0, alice);
    h.instances[0]!.gateway.closeExpired(Math.floor(Date.now() / 1000) + 7200);
    expect((await s.closed).code).toBe(4001);
  });
});

describe("messaging across instances", () => {
  test("Alice on instance 0 reaches Bob on instance 1, ack carries the seq", async () => {
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, room); await h.subscribe(b, room);

    const clientMsgId = sendMsg(a, "Hello across servers!");
    const ack = await a.nextType("message.ack");
    const got = await b.nextType("message.new");

    expect(ack.clientMsgId).toBe(clientMsgId);
    expect(got.message.body).toBe("Hello across servers!");
    expect(got.message.seq).toBe(ack.seq);
    expect(got.message.senderId).toBe(alice.id);
    // One delivery path: the sender's own subscription gets it too (other tabs rely on this).
    expect((await a.nextType("message.new")).message.id).toBe(ack.id);
    a.close(); b.close();
  });

  test("a user's second tab on another instance receives their messages", async () => {
    const [tab1, tab2] = [await h.connect(0, alice), await h.connect(1, alice)];
    await h.subscribe(tab1, room); await h.subscribe(tab2, room);
    sendMsg(tab1, "from tab 1");
    expect((await tab2.nextType("message.new")).message.body).toBe("from tab 1");
    tab1.close(); tab2.close();
  });

  test("only subscribed sockets receive a room's messages", async () => {
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, room);                     // bob never subscribes
    sendMsg(a, "private to subscribers");
    await a.nextType("message.new");
    await b.expectNone((e) => e.type === "message.new");
    a.close(); b.close();
  });

  test("unsubscribe stops delivery; double subscribe doesn't double-deliver", async () => {
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, room); await h.subscribe(b, room); await h.subscribe(b, room);
    sendMsg(a, "once");
    await b.nextType("message.new");
    await b.expectNone((e) => e.type === "message.new"); // not twice

    b.send({ type: "room.unsubscribe", roomId: room });
    await Bun.sleep(100);
    sendMsg(a, "after unsubscribe");
    await a.nextType("message.new"); await a.nextType("message.new");
    await b.expectNone((e) => e.type === "message.new");
    a.close(); b.close();
  });

  test("closing a socket releases its bus subscriptions (no leaks)", async () => {
    const loner = await h.register("leak");              // fresh user => fresh user:* topic
    const id = await h.group(loner, [], "leak");
    await Bun.sleep(200);                                // let earlier tests' sockets finish closing
    const before = h.instances[1]!.bus.topicCount;
    const s = await h.connect(1, loner);
    await h.subscribe(s, id);
    expect(h.instances[1]!.bus.topicCount).toBe(before + 2); // user:* and room:*
    s.close(); await s.closed; await Bun.sleep(100);
    expect(h.instances[1]!.bus.topicCount).toBe(before);
  });
});

describe("authorization", () => {
  test("a non-member can't subscribe, send, sync or type", async () => {
    const m = await h.connect(0, mallory);
    m.send({ type: "room.subscribe", roomId: room });
    m.send({ type: "sync", roomId: room, afterSeq: 0 });
    m.send({ type: "typing", roomId: room });
    const cid = sendMsg(m, "let me in");
    for (let i = 0; i < 4; i++) expect((await m.nextType("error")).code).toBe("FORBIDDEN");
    void cid;
    expect(await h.prisma.message.count({ where: { senderId: mallory.id } })).toBe(0);
    m.close();
  });

  test("removed members stop receiving on every instance, immediately", async () => {
    const id = await h.group(alice, [bob], "revoke");
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, id); await h.subscribe(b, id);

    const res = await h.http(0, "DELETE", `/rooms/${id}/members/${bob.id}`, { token: alice.token });
    expect(res.status).toBe(200);
    expect((await b.nextType("room.removed")).roomId).toBe(id);

    sendMsg(a, "bob is gone", id);
    await a.nextType("message.new");
    await b.expectNone((e) => e.type === "message.new");
    sendMsg(b, "can I still talk?", id);
    expect((await b.nextType("error")).code).toBe("FORBIDDEN");
    a.close(); b.close();
  });

  test("a newly added member is told, and can subscribe right away", async () => {
    const id = await h.group(alice, [], "invite");
    const b = await h.connect(1, bob);
    await h.http(0, "POST", `/rooms/${id}/members`, { token: alice.token, body: { userId: bob.id } });
    expect((await b.nextType("room.added")).roomId).toBe(id);
    await h.subscribe(b, id);
    b.close();
  });
});

describe("reliability", () => {
  test("retrying a clientMsgId stores one row and re-acks the same seq", async () => {
    const a = await h.connect(0, alice);
    const clientMsgId = crypto.randomUUID();
    sendMsg(a, "exactly once", room, clientMsgId); sendMsg(a, "exactly once", room, clientMsgId);
    const [first, second] = [await a.nextType("message.ack"), await a.nextType("message.ack")];
    expect(second.id).toBe(first.id);
    expect(second.seq).toBe(first.seq);
    expect(await h.prisma.message.count({ where: { senderId: alice.id, clientMsgId } })).toBe(1);
    a.close();
  });

  test("a retry racing the original (concurrent) doesn't burn a seq", async () => {
    const id = await h.group(alice, [], "race");
    const [a1, a2] = [await h.connect(0, alice), await h.connect(1, alice)];
    const clientMsgId = crypto.randomUUID();
    sendMsg(a1, "race", id, clientMsgId); sendMsg(a2, "race", id, clientMsgId);
    const [x, y] = [await a1.nextType("message.ack"), await a2.nextType("message.ack")];
    expect(x.id).toBe(y.id);
    sendMsg(a1, "next", id);
    expect((await a1.nextType("message.ack")).seq).toBe(x.seq + 1); // no gap
    a1.close(); a2.close();
  });

  test("50 concurrent senders get seq 1..50 with no gaps or duplicates", async () => {
    const id = await h.group(alice, [], "gapless");
    const users = await Promise.all(Array.from({ length: 50 }, (_, i) => h.register(`g${i}`)));
    await Promise.all(users.map((u) => h.http(0, "POST", `/rooms/${id}/members`, { token: alice.token, body: { userId: u.id } })));
    const socks = await Promise.all(users.map((u, i) => h.connect(i % 2, u)));

    socks.forEach((s, i) => sendMsg(s, `m${i}`, id));
    const acks = await Promise.all(socks.map((s) => s.nextType("message.ack", 10_000)));

    expect(acks.map((a) => a.seq).sort((x, y) => x - y)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    socks.forEach((s) => s.close());
  }, 30_000);

  test("sync returns exactly the missed messages, in order, with exact hasMore", async () => {
    const id = await h.group(alice, [bob], "sync");
    await h.prisma.room.update({ where: { id }, data: { lastSeq: 120 } });
    await h.prisma.message.createMany({
      data: Array.from({ length: 120 }, (_, i) => ({ roomId: id, seq: i + 1, senderId: alice.id, clientMsgId: crypto.randomUUID(), body: `${i + 1}` })),
    });
    const b = await h.connect(1, bob);

    b.send({ type: "sync", roomId: id, afterSeq: 0 });
    const page1 = await b.nextType("sync.result");
    expect(page1.messages).toHaveLength(100);
    expect(page1.messages[0].seq).toBe(1);
    expect(page1.hasMore).toBe(true);

    b.send({ type: "sync", roomId: id, afterSeq: 100 });
    const page2 = await b.nextType("sync.result");
    expect(page2.messages.map((m: any) => m.seq)).toEqual(Array.from({ length: 20 }, (_, i) => 101 + i));
    expect(page2.hasMore).toBe(false);

    b.send({ type: "sync", roomId: id, afterSeq: 120 });
    expect((await b.nextType("sync.result")).messages).toEqual([]);
    b.close();
  });

  test("reconnect gap recovery: messages sent while offline arrive via sync", async () => {
    const id = await h.group(alice, [bob], "gap");
    const [a, b1] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, id); await h.subscribe(b1, id);
    sendMsg(a, "seen", id);
    const seen = (await b1.nextType("message.new")).message;
    b1.close(); await b1.closed;

    sendMsg(a, "missed 1", id); sendMsg(a, "missed 2", id);
    await a.next((e) => e.type === "message.ack" && e.seq === seen.seq + 2);

    const b2 = await h.connect(1, bob);
    await h.subscribe(b2, id);                                  // subscribe first...
    b2.send({ type: "sync", roomId: id, afterSeq: seen.seq });  // ...then sync
    const res = await b2.nextType("sync.result");
    expect(res.messages.map((m: any) => m.body)).toEqual(["missed 1", "missed 2"]);
    a.close(); b2.close();
  });
});

describe("validation and limits", () => {
  test.each([
    ["unknown type", { type: "nope" }],
    ["empty body", { type: "message.send", roomId: "r", clientMsgId: crypto.randomUUID(), body: "" }],
    ["body > 4000", { type: "message.send", roomId: "r", clientMsgId: crypto.randomUUID(), body: "x".repeat(4001) }],
    ["non-uuid clientMsgId", { type: "message.send", roomId: "r", clientMsgId: "abc", body: "hi" }],
    ["negative afterSeq", { type: "sync", roomId: "r", afterSeq: -1 }],
  ])("%s is rejected without dropping the socket", async (_name, frame) => {
    const a = await h.connect(0, alice);
    a.send(frame);
    await Bun.sleep(100);
    expect(a.ws.readyState).toBe(WebSocket.OPEN);
    a.send({ type: "heartbeat" }); // still usable
    a.close();
  });

  test("an oversized frame closes the socket with 1009", async () => {
    const a = await h.connect(0, alice);
    a.send({ type: "message.send", roomId: room, clientMsgId: crypto.randomUUID(), body: "x".repeat(20_000) });
    // Bun drops the connection without a close frame the client can read (1006 client-side, 1009 on the wire).
    expect([1006, 1009]).toContain((await a.closed).code);
  });

  test("flooding gets RATE_LIMITED errors, not a dead socket", async () => {
    const limited = await createHarness({ instances: 1, config: { messageRateLimit: { max: 3, windowSeconds: 30 } } });
    const [u, v] = await Promise.all([limited.register("flood"), limited.register("other")]);
    const id = await limited.group(u, [v]);
    const s = await limited.connect(0, u);
    for (let i = 0; i < 5; i++) sendMsg(s, `spam ${i}`, id);
    const outcomes = [];
    for (let i = 0; i < 5; i++) outcomes.push((await s.next((e) => e.type === "message.ack" || e.type === "error")).type);
    expect(outcomes.filter((o) => o === "message.ack")).toHaveLength(3);
    expect(outcomes.filter((o) => o === "error")).toHaveLength(2);
    expect(s.ws.readyState).toBe(WebSocket.OPEN);
    expect(limited.instances[0]!.app.server).toBeTruthy();
    s.close();
    await limited.cleanup();
  });
});

describe("typing and read receipts", () => {
  test("typing and read.update fan out to the room on other instances", async () => {
    const id = await h.group(alice, [bob], "ephemeral");
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, id); await h.subscribe(b, id);

    a.send({ type: "typing", roomId: id });
    expect(await b.nextType("typing")).toMatchObject({ roomId: id, userId: alice.id });

    await h.prisma.room.update({ where: { id }, data: { lastSeq: 2 } });
    b.send({ type: "read", roomId: id, seq: 2 });
    expect(await a.nextType("read.update")).toMatchObject({ roomId: id, userId: bob.id, seq: 2 });
    a.close(); b.close();
  });
});

describe("presence", () => {
  test("room members see online/offline transitions (first connect, last disconnect only)", async () => {
    const [watching, subject] = await Promise.all([h.register("watcher"), h.register("subject")]);
    const id = await h.group(watching, [subject], "presence");
    const watcher = await h.connect(0, watching);
    await h.subscribe(watcher, id);

    const tab1 = await h.connect(1, subject);
    expect(await watcher.nextType("presence.update")).toMatchObject({ userId: subject.id, online: true });

    const tab2 = await h.connect(0, subject);               // second tab: no new transition
    await watcher.expectNone((e) => e.type === "presence.update");

    tab1.close(); await tab1.closed;                    // one tab left: still online
    await watcher.expectNone((e) => e.type === "presence.update");

    tab2.close();
    expect(await watcher.nextType("presence.update")).toMatchObject({ userId: subject.id, online: false });
    watcher.close();
  });

  test("a crashed instance's users go offline via the lock-guarded sweeper", async () => {
    const boss = await h.register("boss");
    const id = await h.group(boss, [], "crash");
    const watcher = await h.connect(0, boss);
    await h.subscribe(watcher, id);
    const ghost = await h.register("ghost");
    await h.http(0, "POST", `/rooms/${id}/members`, { token: boss.token, body: { userId: ghost.id } });

    const g = await h.connect(1, ghost);
    await watcher.next((e) => e.type === "presence.update" && e.userId === ghost.id && e.online);
    // Simulate a crash: no close event, heartbeats just stop.
    const key = `presence:user:${ghost.id}`;
    const [connId] = await h.instances[1]!.redis.zrange(key, "0", "-1");
    await h.instances[1]!.redis.zadd(key, Date.now() - 120_000, connId!);
    await Promise.all(h.instances.map((i) => i.jobs.sweep()));   // both race for the lock
    expect(await watcher.next((e) => e.type === "presence.update" && e.userId === ghost.id && !e.online))
      .toMatchObject({ online: false });
    await watcher.expectNone((e) => e.type === "presence.update" && e.userId === ghost.id); // announced once
    g.close(); watcher.close();
  });

  test("GET /users/:id/presence and room details reflect it", async () => {
    const [viewer, target] = await Promise.all([h.register("viewer"), h.register("target")]);
    const id = await h.group(viewer, [target], "pres-http");
    const presence = async () => (await h.http(0, "GET", `/users/${target.id}/presence`, { token: viewer.token })).body.online;
    expect(await presence()).toBe(false);
    const t = await h.connect(0, target);
    expect(await presence()).toBe(true);
    const details = await h.http(0, "GET", `/rooms/${id}`, { token: viewer.token });
    expect(details.body.members.find((m: any) => m.userId === target.id).online).toBe(true);
    t.close(); await t.closed; await Bun.sleep(100);
    expect(await presence()).toBe(false);
  });
});

describe("operations", () => {
  test("graceful shutdown: /ready flips, new upgrades refused, sockets closed 1012", async () => {
    const solo = await createHarness({ instances: 1 });
    const u = await solo.register("drain");
    const s = await solo.connect(0, u);
    const t = await solo.ticket(0, u);
    const port = solo.instances[0]!.server.port;

    expect((await solo.http(0, "GET", "/ready")).status).toBe(200);
    const stopping = solo.instances[0]!.stop();
    expect((await s.closed).code).toBe(1012);
    await stopping;
    await expect(connectWs(`ws://localhost:${port}/ws?ticket=${t}`).opened).rejects.toThrow();
    await solo.cleanup().catch(() => {});
  });

  test("/metrics exposes connection and message counters", async () => {
    const before = (await h.http(0, "GET", "/metrics")).body;
    const a = await h.connect(0, alice);
    sendMsg(a, "count me");
    await a.nextType("message.ack");
    const after = (await h.http(0, "GET", "/metrics")).body;
    expect(after.connections).toBe(before.connections + 1);
    expect(after.messagesSent).toBe(before.messagesSent + 1);
    a.close();
  });
});
