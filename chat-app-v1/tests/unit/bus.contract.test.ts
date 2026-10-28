import { describe, test, expect, afterEach } from "bun:test";
import { createRedisClients } from "../../src/lib/redis";
import type { MessageBus, BusEvent } from "../../src/modules/realtime/bus";
import { MemoryBus } from "../../src/modules/realtime/memory-bus";
import { RedisBus } from "../../src/modules/realtime/redis-bus";
import { clusterAvailable, TEST_CLUSTER_NODES, TEST_REDIS_URL } from "../helpers/env";

// One contract, two implementations.
const redisBus = (sharded: boolean, cluster = false) => () => {
  const c = createRedisClients(cluster ? { clusterNodes: TEST_CLUSTER_NODES } : TEST_REDIS_URL);
  return new RedisBus(c.redis, c.subscriber, { prefix: `test:${crypto.randomUUID()}:`, sharded });
};
const factories: Array<[string, () => MessageBus, boolean]> = [
  ["MemoryBus", () => new MemoryBus(), true],
  ["RedisBus", redisBus(false), true],
  ["RedisBus (sharded Pub/Sub)", redisBus(true), true],
  ["RedisBus (sharded, Redis Cluster)", redisBus(true, true), clusterAvailable],
];

for (const [name, make, enabled] of factories) {
  describe.skipIf(!enabled)(`MessageBus contract: ${name}`, () => {
    const buses: MessageBus[] = [];
    const fresh = () => { const b = make(); buses.push(b); return b; };
    afterEach(async () => { await Promise.all(buses.splice(0).map((b) => b.close())); });

    const collect = (bus: MessageBus) => {
      const got: Array<[string, BusEvent]> = [];
      bus.onEvent((topic, event) => got.push([topic, event]));
      return got;
    };
    const until = async (cond: () => boolean) => { for (let i = 0; i < 100 && !cond(); i++) await Bun.sleep(10); };

    test("delivers to a subscribed topic with a version envelope", async () => {
      const bus = fresh(); const got = collect(bus);
      await bus.subscribe("room:1");
      await bus.publish("room:1", { type: "x", n: 1 });
      await until(() => got.length > 0);
      expect(got).toEqual([["room:1", { v: 1, type: "x", n: 1 }]]);
    });

    test("does not deliver topics nobody subscribed to", async () => {
      const bus = fresh(); const got = collect(bus);
      await bus.subscribe("room:1");
      await bus.publish("room:2", { type: "x" });
      await Bun.sleep(100);
      expect(got).toEqual([]);
    });

    test("ref-counts: topic stays live until the last unsubscribe", async () => {
      const bus = fresh(); const got = collect(bus);
      await bus.subscribe("room:1"); await bus.subscribe("room:1");
      expect(bus.topicCount).toBe(1);
      await bus.unsubscribe("room:1"); // 2 -> 1: still subscribed
      await bus.publish("room:1", { type: "x" });
      await until(() => got.length > 0);
      expect(got.length).toBe(1);

      await bus.unsubscribe("room:1"); // 1 -> 0: gone, no leak
      expect(bus.topicCount).toBe(0);
      await bus.publish("room:1", { type: "x" });
      await Bun.sleep(100);
      expect(got.length).toBe(1);
    });

    test("extra unsubscribes are harmless", async () => {
      const bus = fresh();
      await bus.unsubscribe("room:9");
      expect(bus.topicCount).toBe(0);
    });
  });
}

describe.each([[false], [true]])("RedisBus across instances (sharded=%p)", (sharded) => {
  test("a publish on one bus reaches a subscriber on another", async () => {
    const prefix = `test:${crypto.randomUUID()}:`;
    const [a, b] = [0, 1].map(() => { const c = createRedisClients(TEST_REDIS_URL); return new RedisBus(c.redis, c.subscriber, { prefix, sharded }); });
    const got: unknown[] = [];
    b!.onEvent((_t, e) => got.push(e));
    await b!.subscribe("room:1");
    await a!.publish("room:1", { type: "hello" });
    for (let i = 0; i < 100 && got.length === 0; i++) await Bun.sleep(10);
    expect(got).toEqual([{ v: 1, type: "hello" }]);
    await Promise.all([a!.close(), b!.close()]);
  });

  test("ignores payloads from an incompatible version", async () => {
    const prefix = `test:${crypto.randomUUID()}:`;
    const c = createRedisClients(TEST_REDIS_URL);
    const bus = new RedisBus(c.redis, c.subscriber, { prefix, sharded });
    const got: unknown[] = [];
    bus.onEvent((_t, e) => got.push(e));
    await bus.subscribe("room:1");
    const raw = (msg: string) => sharded ? c.redis.spublish(`${prefix}room:1`, msg) : c.redis.publish(`${prefix}room:1`, msg);
    await raw(JSON.stringify({ v: 99, type: "future" }));
    await raw("not json");
    await Bun.sleep(150);
    expect(got).toEqual([]);
    await bus.close();
  });
});
