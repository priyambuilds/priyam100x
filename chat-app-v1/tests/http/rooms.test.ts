import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createHarness, type Harness, type Session } from "../helpers/harness";

let h: Harness;
let alice: Session, bob: Session, carol: Session;
beforeAll(async () => {
  h = await createHarness({ instances: 1 });
  [alice, bob, carol] = await Promise.all([h.register("alice"), h.register("bob"), h.register("carol")]) as [Session, Session, Session];
});
afterAll(() => h.cleanup());

const post = (s: Session, path: string, body?: unknown) => h.http(0, "POST", path, { token: s.token, body });

describe("group rooms", () => {
  test("create: creator is OWNER, listed with members", async () => {
    const res = await post(alice, "/rooms", { name: "team", memberIds: [bob.id] });
    expect(res.status).toBe(201);
    const room = await h.http(0, "GET", `/rooms/${res.body.id}`, { token: alice.token });
    expect(room.body.members.map((m: any) => [m.username, m.role]).sort())
      .toEqual([[alice.username, "OWNER"], [bob.username, "MEMBER"]].sort());
  });

  test("unknown member id -> 400", async () => {
    expect((await post(alice, "/rooms", { name: "x", memberIds: ["nope"] })).status).toBe(400);
  });

  test("non-members can't read a room or its history (403)", async () => {
    const id = await h.group(alice, [bob]);
    expect((await h.http(0, "GET", `/rooms/${id}`, { token: carol.token })).status).toBe(403);
    expect((await h.http(0, "GET", `/rooms/${id}/messages`, { token: carol.token })).status).toBe(403);
  });

  test("only OWNER/ADMIN can add members; duplicates 409", async () => {
    const id = await h.group(alice, [bob]);
    expect((await post(bob, `/rooms/${id}/members`, { userId: carol.id })).status).toBe(403);
    expect((await post(alice, `/rooms/${id}/members`, { userId: carol.id })).status).toBe(201);
    expect((await post(alice, `/rooms/${id}/members`, { userId: carol.id })).status).toBe(409);
    expect((await h.http(0, "GET", `/rooms/${id}`, { token: carol.token })).status).toBe(200);
  });

  test("a member can leave; an owner can kick; a member can't kick", async () => {
    const id = await h.group(alice, [bob, carol]);
    const kick = (actor: Session, target: Session) =>
      h.http(0, "DELETE", `/rooms/${id}/members/${target.id}`, { token: actor.token });
    expect((await kick(bob, carol)).status).toBe(403);
    expect((await kick(alice, carol)).status).toBe(200);
    expect((await h.http(0, "GET", `/rooms/${id}`, { token: carol.token })).status).toBe(403); // cache invalidated
    expect((await kick(bob, bob)).status).toBe(200); // leave
  });

  test("when the owner leaves the longest-standing member becomes OWNER", async () => {
    const id = await h.group(alice, [bob]);
    await h.http(0, "DELETE", `/rooms/${id}/members/${alice.id}`, { token: alice.token });
    const room = await h.http(0, "GET", `/rooms/${id}`, { token: bob.token });
    expect(room.body.members).toHaveLength(1);
    expect(room.body.members[0].role).toBe("OWNER");
  });
});

describe("direct rooms", () => {
  test("start DM is idempotent and symmetric", async () => {
    const first = await post(alice, "/rooms/dm", { userId: bob.id });
    expect(first.status).toBe(201);
    const again = await post(alice, "/rooms/dm", { userId: bob.id });
    const reverse = await post(bob, "/rooms/dm", { userId: alice.id });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect(reverse.body.id).toBe(first.body.id);
  });

  test("concurrent 'start DM' calls create exactly one room", async () => {
    const [x, y] = await Promise.all([h.register("dmx"), h.register("dmy")]);
    const results = await Promise.all([
      post(x, "/rooms/dm", { userId: y.id }), post(y, "/rooms/dm", { userId: x.id }),
      post(x, "/rooms/dm", { userId: y.id }), post(y, "/rooms/dm", { userId: x.id }),
    ]);
    expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
    expect(await h.prisma.room.count({ where: { kind: "DIRECT", members: { some: { userId: x.id } } } })).toBe(1);
  });

  test("can't DM yourself or a ghost; DM membership is fixed", async () => {
    expect((await post(alice, "/rooms/dm", { userId: alice.id })).status).toBe(400);
    expect((await post(alice, "/rooms/dm", { userId: "ghost" })).status).toBe(404);
    const dm = (await post(alice, "/rooms/dm", { userId: bob.id })).body.id;
    expect((await post(alice, `/rooms/${dm}/members`, { userId: carol.id })).status).toBe(400);
  });
});

describe("listing, history, read receipts", () => {
  test("list shows DM peer name, unread counts and last message", async () => {
    const [x, y] = await Promise.all([h.register("lx"), h.register("ly")]);
    const dm = (await post(x, "/rooms/dm", { userId: y.id })).body.id;
    await h.prisma.room.update({ where: { id: dm }, data: { lastSeq: 3 } });
    await h.prisma.message.create({ data: { roomId: dm, seq: 3, senderId: x.id, clientMsgId: crypto.randomUUID(), body: "yo" } });

    const list = await h.http(0, "GET", "/rooms", { token: y.token });
    const entry = list.body.find((r: any) => r.id === dm);
    expect(entry.name).toBe(x.username);
    expect(entry.peer.id).toBe(x.id);
    expect(entry.unreadCount).toBe(3);
    expect(entry.lastMessage.body).toBe("yo");
  });

  test("history: keyset pages, newest first, hasMore exact", async () => {
    const id = await h.group(alice, [bob], "history");
    await h.prisma.room.update({ where: { id }, data: { lastSeq: 7 } });
    await h.prisma.message.createMany({
      data: Array.from({ length: 7 }, (_, i) => ({ roomId: id, seq: i + 1, senderId: alice.id, clientMsgId: crypto.randomUUID(), body: `m${i + 1}` })),
    });
    const page1 = await h.http(0, "GET", `/rooms/${id}/messages?limit=3`, { token: bob.token });
    expect(page1.body.messages.map((m: any) => m.seq)).toEqual([7, 6, 5]);
    expect(page1.body.hasMore).toBe(true);
    const page2 = await h.http(0, "GET", `/rooms/${id}/messages?limit=3&before=${page1.body.nextBefore}`, { token: bob.token });
    expect(page2.body.messages.map((m: any) => m.seq)).toEqual([4, 3, 2]);
    const page3 = await h.http(0, "GET", `/rooms/${id}/messages?limit=3&before=2`, { token: bob.token });
    expect(page3.body.messages.map((m: any) => m.seq)).toEqual([1]);
    expect(page3.body.hasMore).toBe(false);
    expect((await h.http(0, "GET", `/rooms/${id}/messages?limit=1000`, { token: bob.token })).status).toBe(400);
  });

  test("read receipts only move forward and are clamped to lastSeq", async () => {
    const id = await h.group(alice, [bob], "reads");
    await h.prisma.room.update({ where: { id }, data: { lastSeq: 5 } });
    const lastRead = async () =>
      (await h.prisma.roomMember.findUniqueOrThrow({ where: { roomId_userId: { roomId: id, userId: bob.id } } })).lastReadSeq;

    await post(bob, `/rooms/${id}/read`, { seq: 4 });
    expect(await lastRead()).toBe(4);
    await post(bob, `/rooms/${id}/read`, { seq: 2 });   // backwards: ignored
    expect(await lastRead()).toBe(4);
    await post(bob, `/rooms/${id}/read`, { seq: 99 });  // clamped
    expect(await lastRead()).toBe(5);
  });

  test("user search finds others, excludes yourself", async () => {
    const res = await h.http(0, "GET", `/users?q=${alice.username.slice(0, 8)}`, { token: bob.token });
    expect(res.body.some((u: any) => u.id === alice.id)).toBe(true);
    const self = await h.http(0, "GET", `/users?q=${alice.username}`, { token: alice.token });
    expect(self.body.some((u: any) => u.id === alice.id)).toBe(false);
  });
});
