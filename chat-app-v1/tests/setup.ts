import { TEST_DATABASE_URL, TEST_REDIS_URL } from "./helpers/env";

// Safety net: the suite creates rows and publishes to Redis, so it must never
// point at a hosted/shared database (.env is auto-loaded by Bun, which is why
// everything below uses TEST_* variables explicitly).
for (const url of [TEST_DATABASE_URL, TEST_REDIS_URL]) {
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to run tests against non-local host "${host}". Use \`bun run services:up\`.`);
  }
}

// Apply migrations to the throwaway test database.
const proc = Bun.spawnSync(["bunx", "prisma", "migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  stdout: "pipe", stderr: "pipe",
});
if (proc.exitCode !== 0) {
  throw new Error(
    `Could not migrate the test database (is it running? try \`bun run services:up\`).\n${proc.stderr.toString()}`,
  );
}
