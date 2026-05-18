// Auth + User profile modullari.

import type { ModuleDefinition } from '@/configs/types';

// Auth — login va boshqa public endpointlar.
// Login endpointi token qaytaradi, har request'da turlicha → mask qilamiz.
export const authModule: ModuleDefinition = {
  name: 'auth',
  tags: ['auth'],
  basePath: '/api/auth',
  defaultAuth: 'guest',
  // Login response'ida access_token har request'da o'zgaradi.
  maskPaths: ['data.access_token', 'access_token'],
  scenarios: [
    {
      // Phone valid format (9 digits), password valid length, lekin user yo'q.
      name: 'login with non-existent phone returns 401',
      tags: ['auth', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '123456789', password: 'validpassword123' },
      },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      // Password min:8 dan kichik — 422 validation error.
      name: 'login with too-short password returns 422',
      tags: ['auth', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '995016004', password: 'short' },
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      // Phone format invalid (not 9 digits) — 422.
      name: 'login with invalid phone format returns 422',
      tags: ['auth', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '12345', password: 'validpassword123' },
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const userModule: ModuleDefinition = {
  name: 'user',
  tags: ['user'],
  basePath: '/api/v1/user',
  defaultAuth: 'admin',
  // Worker photo MinIO signed URL — har request'da signature o'zgaradi.
  maskPaths: ['data.worker.photo'],
  scenarios: [
    {
      name: 'profile (current admin)',
      tags: ['detail'],
      request: { method: 'GET', path: '/profile' },
    },
  ],
};
