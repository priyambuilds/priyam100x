// Defaults match docker-compose's disposable *-test services.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://chat:chat@localhost:5433/chat_test";
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6380";

// Optional: a 3-master Redis Cluster (`bun run services:cluster`). Cluster tests are
// skipped when it isn't running, so a plain `bun test` still needs only the basics.
export const TEST_CLUSTER_NODES = (process.env.TEST_REDIS_CLUSTER_NODES ?? "127.0.0.1:7001,127.0.0.1:7002,127.0.0.1:7003").split(",");

async function reachable(node: string) {
  const [hostname, port] = node.split(":");
  try {
    const sock = await Bun.connect({ hostname: hostname!, port: Number(port), socket: { data() {}, open() {}, close() {}, error() {} } });
    sock.end();
    return true;
  } catch {
    return false;
  }
}
export const clusterAvailable = await reachable(TEST_CLUSTER_NODES[0]!);
