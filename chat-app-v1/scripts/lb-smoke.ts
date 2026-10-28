// Smoke test for the nginx setup (`bun run lb:up`): connects through the load balancer,
// shows how sockets spread over the two instances, and sends a message between users
// that landed on *different* instances.
const LB = process.env.LB_URL ?? "http://localhost:8080";
const DIRECT = { app1: "http://localhost:3001", app2: "http://localhost:3002" } as const;

const json = (r: Response) => r.json() as Promise<any>;
const post = (url: string, body?: unknown, token?: string) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(json);

const connections = async () =>
  Object.fromEntries(await Promise.all(Object.entries(DIRECT).map(async ([n, u]) => [n, (await json(await fetch(`${u}/metrics`))).connections])));

const tag = crypto.randomUUID().slice(0, 6);
const users = await Promise.all(Array.from({ length: 6 }, async (_, i) => {
  const r = await post(`${LB}/auth/register`, { username: `lb${i}_${tag}`, password: "password123" });
  return { ...r.user, token: r.token as string };
}));

type Sock = { ws: WebSocket; inbox: any[]; instance: string; user: (typeof users)[number] };
const socks: Sock[] = [];
for (const user of users) {
  const before = await connections();
  const { ticket } = await post(`${LB}/ws/ticket`, undefined, user.token);
  const ws = new WebSocket(`${LB.replace("http", "ws")}/ws?ticket=${ticket}`);
  const inbox: any[] = [];
  ws.onmessage = (e) => inbox.push(JSON.parse(e.data));
  await new Promise((r) => (ws.onopen = r));
  await Bun.sleep(150);
  const after = await connections();
  const instance = Object.keys(after).find((k) => after[k] > before[k])!;
  socks.push({ ws, inbox, instance, user });
}
console.log("socket placement through nginx:", socks.map((s) => `${s.user.username.slice(0, 3)}→${s.instance}`).join("  "));
console.log("connections per instance:", await connections());

const a = socks.find((s) => s.instance === "app1");
const b = socks.find((s) => s.instance === "app2");
if (!a || !b) throw new Error("all sockets landed on one instance: nginx isn't balancing");

const room = (await post(`${LB}/rooms`, { name: "lb-test", memberIds: [b.user.id] }, a.user.token)).id;
for (const s of [a, b]) s.ws.send(JSON.stringify({ type: "room.subscribe", roomId: room }));
await Bun.sleep(300);
a.ws.send(JSON.stringify({ type: "message.send", roomId: room, clientMsgId: crypto.randomUUID(), body: "hello via nginx" }));
await Bun.sleep(500);
const got = b.inbox.find((e) => e.type === "message.new");
console.log(got ? `✅ ${a.instance} → ${b.instance}: "${got.message.body}"` : "❌ message did not cross instances");

socks.forEach((s) => s.ws.close());
process.exit(got ? 0 : 1);
