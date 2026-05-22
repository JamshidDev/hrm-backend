// Auth Liveness parity scenariolari. Laravel: UserFaceController (startLiveness, validate, complete).

import type { ModuleDefinition } from '@/configs/types';

export const livenessModule: ModuleDefinition = {
  name: 'liveness',
  tags: ['auth'],
  basePath: '/api/auth/v1/liveness',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'start (valid phone)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/start',
        body: { phone: '995016004' },
      },
      statusOnly: true,
    },
    {
      name: 'start empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/start', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'validate non-existent session returns 404',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        path: '/validate',
        body: { session_id: '00000000-0000-0000-0000-000000000000' },
      },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: socket-server-api middleware kerak (API key). Bizda Public stub. Hujjatlangan.',
    },
    {
      name: 'complete non-existent session returns 404',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        path: '/complete',
        body: { session_id: '00000000-0000-0000-0000-000000000000' },
      },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: socket-server-api middleware kerak (API key). Bizda Public stub. Hujjatlangan.',
    },
  ],
};
