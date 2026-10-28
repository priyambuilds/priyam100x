import { startServer } from "../../src/app";
import { loadConfig, type Config } from "../../src/config";
import { createPrisma } from "../../src/lib/prisma";
import { createRedisClients } from "../../src/lib/redis";
import { RedisBus } from "../../src/modules/realtime/redis-bus";
import { TEST_CLUSTER_NODES, TEST_DATABASE_URL, TEST_REDIS_URL } from "./env";
import { connectWs } from "./ws";

export type Session = { id: string; username: string; token: string };

/**
 * N app instances in one process: separate Redis connections and buses, one
 * shared Postgres and Redis. The cheapest honest multi-instance environment.
 */
export async function createHarness(opts: { instances?: number; config?: Partial<Config>; cluster?: boolean; sharded?: boolean } = {}) {
  const prisma = createPrisma(TEST_DATABASE_URL);
  const prefix = `test:${crypto.randomUUID()}:`; // all instances share it; other test files can't hear us
  const jwtSecret = "test-secret-test-secret";

  const instances = Array.from({ length: opts.instances ?? 2 }, (_, i) => {
    const clients = createRedisClients(opts.cluster ? { clusterNodes: TEST_CLUSTER_NODES } : TEST_REDIS_URL);
    // A cluster always uses sharded Pub/Sub; on a single node it's opt-in.
    const bus = new RedisBus(clients.redis, clients.subscriber, { prefix, sharded: opts.cluster || opts.sharded });
    const config: Config = {
      ...loadConfig({ JWT_SECRET: jwtSecret, INSTANCE_ID: `test-${i}` }),
      ...opts.config,
    };
    const running = startServer({ config, prisma, redis: clients.redis, bus }, 0);
    return { ...running, redis: clients.redis, bus, base: `http://localhost:${running.server.port}` };
  });

  const tag = crypto.randomUUID().slice(0, 8);
  const createdUsers: string[] = [];

  async function http(i: number, method: string, path: string, opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {}) {
    const res = await fetch(instances[i]!.base + path, {
      method,
      headers: {
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let body: any = text;
    try { body = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, body };
  }

  async function register(name: string): Promise<Session> {
    const username = `${name}_${tag}`.slice(0, 32);
    const { status, body } = await http(0, "POST", "/auth/register", { body: { username, password: "password123" } });
    if (status !== 201) throw new Error(`register failed: ${status} ${JSON.stringify(body)}`);
    createdUsers.push(body.user.id);
    return { id: body.user.id, username, token: body.token };
  }

  async function ticket(i: number, session: Session) {
    const { body } = await http(i, "POST", "/ws/ticket", { token: session.token });
    return body.ticket as string;
  }

  /** Open an authenticated socket on instance `i` and wait for `connected`. */
  async function connect(i: number, session: Session) {
    const sock = connectWs(`ws://localhost:${instances[i]!.server.port}/ws?ticket=${await ticket(i, session)}`);
    await sock.opened;
    await sock.nextType("connected");
    return sock;
  }

  async function group(owner: Session, members: Session[], name = "room") {
    const { status, body } = await http(0, "POST", "/rooms", {
      token: owner.token, body: { name, memberIds: members.map((m) => m.id) },
    });
    if (status !== 201) throw new Error(`createGroup failed ${status}`);
    return body.id as string;
  }

  /** Subscribe and wait for the server's `room.subscribed` ack. */
  async function subscribe(sock: Awaited<ReturnType<typeof connect>>, roomId: string) {
    sock.send({ type: "room.subscribe", roomId });
    await sock.next((e) => e.type === "room.subscribed" && e.roomId === roomId);
  }

  async function cleanup() {
    await Promise.all(instances.map((x) => x.stop()));
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } }); // cascades rooms/messages
    await Promise.all(instances.map((x) => x.bus.close()));
    await prisma.$disconnect();
  }

  return { prisma, instances, http, register, ticket, connect, group, subscribe, cleanup, tag };
}
export type Harness = Awaited<ReturnType<typeof createHarness>>;
