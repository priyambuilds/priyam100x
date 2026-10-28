import { describe, test, expect } from "bun:test";
import { buildApp } from "../../src/app";
import { loadConfig } from "../../src/config";

// No services needed: spec generation and config validation never connect.
const { app } = buildApp({
  config: loadConfig({ JWT_SECRET: "spec-only-secret-123" }),
  prisma: {} as never, redis: {} as never, bus: {} as never,
});
const spec = async () => (await app.handle(new Request("http://localhost/openapi/json"))).json() as Promise<any>;

describe("OpenAPI", () => {
  test("is served and documents every HTTP route", async () => {
    const s = await spec();
    expect(s.info.title).toBe("Chat API");
    expect(Object.keys(s.paths)).toEqual(expect.arrayContaining([
      "/auth/register", "/auth/login", "/me", "/ws/ticket", "/users/", "/rooms/", "/rooms/dm",
      "/rooms/{roomId}", "/rooms/{roomId}/messages", "/rooms/{roomId}/members",
      "/rooms/{roomId}/members/{userId}", "/rooms/{roomId}/read", "/health", "/metrics",
    ]));
  });

  test("declares bearer auth and marks protected routes", async () => {
    const s = await spec();
    expect(s.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(s.paths["/rooms/"].get.security).toEqual([{ bearerAuth: [] }]);
    expect(s.paths["/auth/login"].post.security).toBeUndefined();
  });

  test("request bodies carry the validation schema", async () => {
    const s = await spec();
    const body = s.paths["/auth/register"].post.requestBody.content["application/json"].schema;
    expect(body.properties.username.minLength).toBe(3);
    expect(body.properties.password.minLength).toBe(8);
  });

  test("docs UI is served", async () => {
    const res = await app.handle(new Request("http://localhost/openapi"));
    expect(res.status).toBe(200);
  });
});

describe("config", () => {
  test("refuses to boot without a real JWT secret", () => {
    expect(() => loadConfig({})).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });
  test("parses lists and numbers", () => {
    const c = loadConfig({ JWT_SECRET: "x".repeat(16), ALLOWED_ORIGINS: "http://a.com, http://b.com", PORT: "4000" });
    expect(c.allowedOrigins).toEqual(["http://a.com", "http://b.com"]);
    expect(c.port).toBe(4000);
  });
});

describe("health", () => {
  test("/health is ok and unauthenticated", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
