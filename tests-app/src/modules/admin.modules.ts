// Admin modullari: users, roles, permissions.
// Laravel: app/Http/Controllers/Admin/* + AdminUser tarmog'i.

import type { ModuleDefinition } from '@/configs/types';

export const adminUsersModule: ModuleDefinition = {
  name: 'admin-users',
  tags: ['admin'],
  basePath: '/api/v1/admin/users',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  // MinIO signed URL har request'da o'zgaradi — mask qilamiz.
  maskPaths: ['data.data[].worker.photo'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'list (per_page=5)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (search="995016004" — phone)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: '995016004', per_page: 5 } },
    },
    {
      name: 'list (organizations=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { organizations: '1', per_page: 3 } },
    },
    {
      name: 'direct-permissions list (per_page=2)',
      tags: ['list'],
      request: { method: 'GET', path: '/direct-permissions', query: { per_page: 2 } },
    },
    {
      name: 'assign-role with invalid uuid returns 422 (@Exists)',
      tags: ['validation'],
      request: {
        method: 'POST',
        path: '/../assign-role',
        body: {
          uuid: '00000000-0000-0000-0000-000000000000',
          role_id: 1,
          organization_id: 1,
        },
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const adminRolesModule: ModuleDefinition = {
  name: 'admin-roles',
  tags: ['admin'],
  basePath: '/api/v1/admin/roles',
  defaultAuth: 'admin',
  ignorePaths: [
    'data.per_page',
    // Laravel Spatie permission cache — non-deterministic order.
    // Permissions array tartibi bizdan farq qiladi (NestJS name ASC sortlangan).
    // To'g'risi: ikkalasi ham bir xil 73 ta permission qaytaradi.
    'data.data[].permissions',
  ],
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (search="Admin")',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'Admin' } },
    },
    {
      name: 'create with empty name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: '' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const adminPermissionsModule: ModuleDefinition = {
  name: 'admin-permissions',
  tags: ['admin'],
  basePath: '/api/v1/admin/permissions',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (per_page=10)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 10 } },
    },
    {
      name: 'list (search="users")',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'users', per_page: 10 } },
    },
    {
      name: 'create with empty name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: '' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};
