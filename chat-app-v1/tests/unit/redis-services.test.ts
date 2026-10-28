import { describe, test, expect, afterAll } from "bun:test";
import { createRedisClients } from "../../src/lib/redis";
import { acquireLock, releaseLock, withLock } from "../../src/jobs/lock";
import { isRateLimited } from "../../src/modules/ratelimit";
import * as presence from "../../src/modules/presence/service";
import { createTicket, consumeTicket } from "../../src/modules/auth/ticket";
import { TEST_REDIS_URL } from "../helpers/env";

const { redis, subscriber } = createRedisClients(TEST_REDIS_URL);
afterAll(() => { redis.disconnect(); subscriber.disconnect(); });
const id = () => crypto.randomUUID();

describe("tickets", () => {
  test("are single-use", async () => {
    const t = await createTicket(redis, { userId: "u1", exp: 123 });
    expect(await consumeTicket(redis, t)).toEqual({ userId: "u1", exp: 123 });
    expect(await consumeTicket(redis, t)).toBeNull();
  });

  test("unknown tickets are rejected", async () => {
    expect(await consumeTicket(redis, "nope")).toBeNull();
  });

  test("of two simultaneous consumers exactly one wins", async () => {
    const t = await createTicket(redis, { userId: "u1", exp: 123 });
    const results = await Promise.all([consumeTicket(redis, t), consumeTicket(redis, t)]);
    expect(results.filter(Boolean).length).toBe(1);
  });
});

describe("rate limit", () => {
  test("allows up to max then blocks, per subject", async () => {
    const [a, b] = [id(), id()];
    const limit = { max: 3, windowSeconds: 30 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await isRateLimited(redis, "t", a, limit));
    expect(results).toEqual([false, false, false, true, true]);
    expect(await isRateLimited(redis, "t", b, limit)).toBe(false);
  });

  test("always leaves a TTL on the counter", async () => {
    const subject = id();
    await isRateLimited(redis, "t", subject, { max: 1, windowSeconds: 30 });
    const keys = await redis.keys(`rl:t:${subject}:*`);
    expect(keys.length).toBe(1);
    expect(await redis.ttl(keys[0]!)).toBeGreaterThan(0);
  });
});

describe("lock", () => {
  test("only one holder at a time", async () => {
    const name = id();
    const first = await acquireLock(redis, name, 5000);
    expect(first).not.toBeNull();
    expect(await acquireLock(redis, name, 5000)).toBeNull();
    await releaseLock(redis, name, first!);
    expect(await acquireLock(redis, name, 5000)).not.toBeNull();
  });

  test("release with the wrong token does not free someone else's lock", async () => {
    const name = id();
    await acquireLock(redis, name, 5000);
    await releaseLock(redis, name, "not-my-token");
    expect(await acquireLock(redis, name, 5000)).toBeNull();
  });

  test("withLock skips when held and releases afterwards", async () => {
    const name = id();
    let ran = 0;
    const held = await acquireLock(redis, name, 5000);
    expect(await withLock(redis, name, 5000, async () => { ran++; })).toBe(false);
    await releaseLock(redis, name, held!);
    expect(await withLock(redis, name, 5000, async () => { ran++; })).toBe(true);
    expect(await withLock(redis, name, 5000, async () => { ran++; })).toBe(true);
    expect(ran).toBe(2);
  });
});

describe("presence", () => {
  test("transitions only on first connect and last disconnect (multi-tab)", async () => {
    const u = id();
    expect(await presence.touch(redis, u, "tab1")).toBe(true);   // offline -> online
    expect(await presence.touch(redis, u, "tab2")).toBe(false);
    expect(await presence.touch(redis, u, "tab1")).toBe(false);  // heartbeat
    expect([...(await presence.onlineAmong(redis, [u]))]).toEqual([u]);
    expect(await presence.leave(redis, u, "tab1")).toBe(false);  // still has tab2
    expect(await presence.leave(redis, u, "tab2")).toBe(true);   // last one
    expect((await presence.onlineAmong(redis, [u])).size).toBe(0);
  });

  test("a crashed connection ages out and the sweeper reports the user", async () => {
    const u = id();
    await presence.touch(redis, u, "ghost");
    // Simulate a heartbeat from 2 minutes ago (instance died, no close event).
    await redis.zadd(`presence:user:${u}`, Date.now() - 120_000, "ghost");
    expect((await presence.onlineAmong(redis, [u])).size).toBe(0);
    expect(await presence.findExpired(redis)).toContain(u);
    expect(await presence.findExpired(redis)).not.toContain(u); // reported once
  });
});
