// Writes the OpenAPI spec to openapi.json without starting a server or any connections.
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';

const { app } = buildApp({
  config: loadConfig({ JWT_SECRET: 'spec-generation-only-secret' }),
  prisma: {} as never, redis: {} as never, bus: {} as never,
});
const res = await app.handle(new Request('http://localhost/openapi/json'));
await Bun.write('openapi.json', JSON.stringify(await res.json(), null, 2) + '\n');
console.log('Wrote openapi.json');
