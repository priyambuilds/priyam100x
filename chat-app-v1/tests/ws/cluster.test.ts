import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createHarness, type Harness, type Session } from "../helpers/harness";
import { clusterAvailable } from "../helpers/env";

// The whole stack on a Redis Cluster with sharded Pub/Sub: tickets, rate limits,
// membership cache, presence, locks and fan-out must all be cluster-safe
// (single-key commands or same-slot MULTI, never CROSSSLOT).
describe.skipIf(!clusterAvailable)("on a Redis Cluster (sharded Pub/Sub)", () => {
  let h: Harness;
  let alice: Session, bob: Session;
  let room: string;

  beforeAll(async () => {
    h = await createHarness({ instances: 2, cluster: true });
    [alice, bob] = await Promise.all([h.register("alice"), h.register("bob")]) as [Session, Session];
    room = await h.group(alice, [bob]);
  });
  afterAll(() => h.cleanup());

  test("Alice on instance 0 reaches Bob on instance 1", async () => {
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, room); await h.subscribe(b, room);
    a.send({ type: "message.send", roomId: room, clientMsgId: crypto.randomUUID(), body: "across the cluster" });
    expect((await a.nextType("message.ack")).seq).toBe(1);
    expect((await b.nextType("message.new")).message.body).toBe("across the cluster");
    a.close(); b.close();
  });

  test("typing, presence and removal revocation work too", async () => {
    const [a, b] = [await h.connect(0, alice), await h.connect(1, bob)];
    await h.subscribe(a, room); await h.subscribe(b, room);
    a.send({ type: "typing", roomId: room });
    expect(await b.nextType("typing")).toMatchObject({ userId: alice.id });

    expect((await h.http(0, "GET", `/users/${bob.id}/presence`, { token: alice.token })).body.online).toBe(true);

    await h.http(0, "DELETE", `/rooms/${room}/members/${bob.id}`, { token: alice.token });
    expect((await b.nextType("room.removed")).roomId).toBe(room);
    a.close(); b.close();
  });

  test("the sweeper lock works on a cluster", async () => {
    const ran = await Promise.all(h.instances.map((i) => i.jobs.sweep()));
    expect(ran).toHaveLength(2);
  });
});
