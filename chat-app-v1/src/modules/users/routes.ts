import { Elysia, t } from 'elysia';
import type { AppDependencies } from '../../deps';
import { authPlugin, bearer } from '../../plugins/auth';
import { onlineAmong } from '../presence/service';

export const userRoutes = ({ prisma, redis, config }: AppDependencies) =>
  new Elysia({ prefix: '/users', tags: ['Users'] })
    .use(authPlugin(config))
    .get('/', async ({ query, userId }) => {
      const users = await prisma.user.findMany({
        where: { username: { contains: query.q, mode: 'insensitive' }, NOT: { id: userId } },
        select: { id: true, username: true },
        orderBy: { username: 'asc' },
        take: 20,
      });
      return users;
    }, {
      auth: true,
      query: t.Object({ q: t.String({ minLength: 1, maxLength: 32 }) }),
      detail: { summary: 'Search users by username (for starting DMs / adding members)', security: bearer },
    })
    .get('/:id/presence', async ({ params }) => {
      const online = await onlineAmong(redis, [params.id]);
      return { userId: params.id, online: online.has(params.id) };
    }, {
      auth: true,
      detail: { summary: 'Is this user online?', security: bearer },
    });
