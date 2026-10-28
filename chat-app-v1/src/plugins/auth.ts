import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import type { Config } from '../config';
import { unauthorized } from '../errors';

// Adds `auth: true` to any route. The handler then receives a verified
// `userId` (JWT `sub`) and `tokenExp` (unix seconds), or the request gets a 401.
export const authPlugin = (config: Pick<Config, 'jwtSecret' | 'jwtTtlSeconds'>) =>
  new Elysia({ name: 'auth' })
    .use(jwt({ name: 'jwt', secret: config.jwtSecret, exp: `${config.jwtTtlSeconds}s` }))
    .macro({
      auth: {
        async resolve({ headers, jwt }) {
          const header = headers.authorization;
          const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
          const payload = token ? await jwt.verify(token) : false;
          if (!payload || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
            throw unauthorized('Missing or invalid token');
          }
          return { userId: payload.sub, tokenExp: payload.exp };
        },
      },
    });

/** OpenAPI marker so Swagger/Scalar show the lock icon + Authorize button. */
export const bearer = [{ bearerAuth: [] }];
