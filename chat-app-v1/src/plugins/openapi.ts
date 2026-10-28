import { openapi } from '@elysiajs/openapi';

// Interactive docs at GET /openapi, raw spec at GET /openapi/json.
export const openapiPlugin = () =>
  openapi({
    path: '/openapi',
    documentation: {
      info: {
        title: 'Chat API',
        version: '1.0.0',
        description:
          'Real-time chat backend: HTTP API + one WebSocket per client (`GET /ws`). ' +
          'The WebSocket protocol is documented in docs/PROTOCOL.md.\n\n' +
          'Flow: `POST /auth/login` -> `POST /ws/ticket` -> `GET /ws?ticket=...`.',
      },
      tags: [
        { name: 'Auth', description: 'Accounts, tokens and WebSocket tickets' },
        { name: 'Users', description: 'User search and presence' },
        { name: 'Rooms', description: 'Group + direct rooms, membership, history, read receipts' },
        { name: 'WebSocket', description: 'Real-time gateway' },
        { name: 'Ops', description: 'Health and metrics' },
      ],
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
  });
