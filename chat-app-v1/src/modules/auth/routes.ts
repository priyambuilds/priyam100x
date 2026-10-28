import { Elysia, t } from 'elysia';
import type { AppDependencies } from '../../deps';
import { authPlugin, bearer } from '../../plugins/auth';
import { tooManyRequests } from '../../errors';
import { isRateLimited } from '../ratelimit';
import { createTicket } from './ticket';
import { register, verifyLogin } from './service';

const Credentials = t.Object({
  username: t.String({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' }),
  // 72 keeps parity with bcrypt-style limits; argon2 itself has no such cap.
  password: t.String({ minLength: 8, maxLength: 72 }),
});

export const authRoutes = (deps: AppDependencies) => {
  const { prisma, redis, config } = deps;

  return new Elysia({ tags: ['Auth'] })
    .use(authPlugin(config))
    .post('/auth/register', async ({ body, jwt, status }) => {
      const user = await register(prisma, body.username, body.password);
      const token = await jwt.sign({ sub: user.id });
      return status(201, { token, user });
    }, {
      body: Credentials,
      detail: { summary: 'Create an account and get a bearer token' },
    })
    .post('/auth/login', async ({ body, jwt, request, server }) => {
      const ip = server?.requestIP(request)?.address ?? 'unknown';
      // Brute-force guard keyed by IP *and* username.
      if (await isRateLimited(redis, 'login', `${ip}:${body.username}`, { max: 10, windowSeconds: 60 })) {
        throw tooManyRequests('Too many login attempts');
      }
      const user = await verifyLogin(prisma, body.username, body.password);
      return { token: await jwt.sign({ sub: user.id }), user };
    }, {
      body: Credentials,
      detail: { summary: 'Exchange username + password for a bearer token' },
    })
    .get('/me', async ({ userId }) => {
      return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, username: true, createdAt: true } });
    }, {
      auth: true,
      detail: { summary: 'Current user', security: bearer },
    })
    .post('/ws/ticket', async ({ userId, tokenExp }) => {
      // The WebSocket API can't set an Authorization header, so trade the JWT
      // for a 30 s one-time ticket and put *that* in the URL.
      return { ticket: await createTicket(redis, { userId, exp: tokenExp }), expiresInSeconds: 30 };
    }, {
      auth: true,
      detail: { summary: 'Get a one-time ticket for `GET /ws?ticket=...`', security: bearer },
    });
};
