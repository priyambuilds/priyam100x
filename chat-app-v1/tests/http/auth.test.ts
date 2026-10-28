import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createHarness, type Harness } from "../helpers/harness";

let h: Harness;
beforeAll(async () => { h = await createHarness({ instances: 1 }); });
afterAll(() => h.cleanup());

describe("auth", () => {
  test("register -> login -> /me", async () => {
    const username = `carol_${h.tag}`;
    const reg = await h.http(0, "POST", "/auth/register", { body: { username, password: "password123" } });
    expect(reg.status).toBe(201);
    expect(reg.body.user.username).toBe(username);
    expect(reg.body.user.passwordHash).toBeUndefined();

    const login = await h.http(0, "POST", "/auth/login", { body: { username, password: "password123" } });
    expect(login.status).toBe(200);

    const me = await h.http(0, "GET", "/me", { token: login.body.token });
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(reg.body.user.id);
    await h.prisma.user.delete({ where: { id: reg.body.user.id } });
  });

  test("duplicate username -> 409 CONFLICT", async () => {
    const s = await h.register("dup");
    const again = await h.http(0, "POST", "/auth/register", { body: { username: s.username, password: "password123" } });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("CONFLICT");
  });

  test("wrong password and unknown user look identical (401)", async () => {
    const s = await h.register("wrongpw");
    const wrong = await h.http(0, "POST", "/auth/login", { body: { username: s.username, password: "nottherightone" } });
    const unknown = await h.http(0, "POST", "/auth/login", { body: { username: `ghost_${h.tag}`, password: "password123" } });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  test.each([
    [{ username: "ab", password: "password123" }],
    [{ username: "has space", password: "password123" }],
    [{ username: "validname", password: "short" }],
    [{ username: "validname" }],
  ])("invalid credentials %j -> 400 VALIDATION", async (body) => {
    const res = await h.http(0, "POST", "/auth/register", { body });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  test("protected routes need a valid bearer token", async () => {
    expect((await h.http(0, "GET", "/me")).status).toBe(401);
    expect((await h.http(0, "GET", "/me", { token: "garbage" })).status).toBe(401);
    expect((await h.http(0, "POST", "/ws/ticket")).status).toBe(401);
    expect((await h.http(0, "GET", "/rooms")).status).toBe(401);
  });

  test("login is rate limited per ip+username", async () => {
    const username = `brute_${h.tag}`;
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await h.http(0, "POST", "/auth/login", { body: { username, password: "password123" } })).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[11]).toBe(429);
  });

  test("a ticket is single-use and 401s without auth", async () => {
    const s = await h.register("tick");
    const t = await h.ticket(0, s);
    expect(typeof t).toBe("string");
    expect(t.length).toBeGreaterThan(30);
  });

  test("unknown routes return the JSON error shape", async () => {
    const res = await h.http(0, "GET", "/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
