import { Elysia, t } from 'elysia';
import type { AppDependencies } from '../../deps';
import { authPlugin, bearer } from '../../plugins/auth';
import * as rooms from './service';


export const roomRoutes = (deps: AppDependencies) =>
  new Elysia({ prefix: '/rooms', tags: ['Rooms'] })
    .use(authPlugin(deps.config))
    .get('/', ({ userId }) => rooms.listRooms(deps, userId), {
      auth: true,
      detail: { summary: 'My rooms with unread counts and last message', security: bearer },
    })
    .post('/', async ({ userId, body, status }) =>
      status(201, await rooms.createGroup(deps, userId, body.name, body.memberIds ?? [])), {
      auth: true,
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        memberIds: t.Optional(t.Array(t.String(), { maxItems: 200 })),
      }),
      detail: { summary: 'Create a group room (you become OWNER)', security: bearer },
    })
    .post('/dm', async ({ userId, body, status }) => {
      const { room, created } = await rooms.getOrCreateDm(deps, userId, body.userId);
      return status(created ? 201 : 200, room);
    }, {
      auth: true,
      body: t.Object({ userId: t.String() }),
      detail: { summary: 'Start (or fetch) a 1:1 direct message room', security: bearer },
    })
    .get('/:roomId', ({ userId, params }) => rooms.getRoom(deps, userId, params.roomId), {
      auth: true,
      detail: { summary: 'Room details, members, roles and presence', security: bearer },
    })
    .get('/:roomId/messages', ({ userId, params, query }) =>
      rooms.getHistory(deps, userId, params.roomId, query.before, query.limit ?? 50), {
      auth: true,
      query: t.Object({
        before: t.Optional(t.Integer({ minimum: 1, description: 'Return messages with seq < before' })),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
      }),
      detail: { summary: 'Message history, newest first (keyset pagination)', security: bearer },
    })
    .post('/:roomId/members', async ({ userId, params, body, status }) => {
      await rooms.addMember(deps, userId, params.roomId, body.userId);
      return status(201, { ok: true });
    }, {
      auth: true,
      body: t.Object({ userId: t.String() }),
      detail: { summary: 'Add a member (OWNER/ADMIN, group rooms)', security: bearer },
    })
    .delete('/:roomId/members/:userId', async ({ userId, params }) => {
      await rooms.removeMember(deps, userId, params.roomId, params.userId);
      return { ok: true };
    }, {
      auth: true,
      detail: { summary: 'Leave a room (use your own id) or remove a member', security: bearer },
    })
    .post('/:roomId/read', ({ userId, params, body }) => rooms.markRead(deps, userId, params.roomId, body.seq), {
      auth: true,
      body: t.Object({ seq: t.Integer({ minimum: 0 }) }),
      detail: { summary: 'Advance my read receipt', security: bearer },
    });
