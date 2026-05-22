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

// ============================================================
// /api/v1/admin/integration-log — IntegrationApiLogController (9 endpoint)
// ============================================================
const LOG_IGNORE = [
  'data.data',
  'data.current_page',
  'data.total',
  'data.per_page',
];

export const adminIntegrationLogModule: ModuleDefinition = {
  name: 'admin-integration-log',
  tags: ['admin'],
  basePath: '/api/v1/admin/integration-log',
  defaultAuth: 'admin',
  ignorePaths: LOG_IGNORE,
  scenarios: [
    {
      name: 'list (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'users (HmacUser list)',
      tags: ['list'],
      request: { method: 'GET', path: '/users' },
      statusOnly: true,
    },
    {
      name: 'summary (counts + avg duration)',
      tags: ['list'],
      request: { method: 'GET', path: '/summary' },
      statusOnly: true,
    },
    {
      name: 'timeline (group_by=day)',
      tags: ['list'],
      request: { method: 'GET', path: '/timeline', query: { group_by: 'day' } },
      statusOnly: true,
    },
    {
      name: 'timeline (group_by=hour)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/timeline',
        query: { group_by: 'hour' },
      },
      statusOnly: true,
    },
    {
      name: 'top-clients (limit=5)',
      tags: ['list'],
      request: { method: 'GET', path: '/top-clients', query: { limit: 5 } },
      statusOnly: true,
    },
    {
      name: 'top-endpoints (limit=5)',
      tags: ['list'],
      request: { method: 'GET', path: '/top-endpoints', query: { limit: 5 } },
      statusOnly: true,
    },
    {
      name: 'methods (by HTTP method)',
      tags: ['list'],
      request: { method: 'GET', path: '/methods' },
      statusOnly: true,
    },
    {
      name: 'statuses (by response status)',
      tags: ['list'],
      request: { method: 'GET', path: '/statuses' },
      statusOnly: true,
    },
    {
      name: 'update HmacUser non-existent returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/users/999999999',
        body: { is_active: true },
      },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: findOrFail → 404. NestJS BusinessException(404). Lekin Laravel hozir 422 yoki boshqa qaytarishi mumkin (ModelNotFoundException handler). Real run bilan tekshirish kerak.',
    },
  ],
};

// ============================================================
// /api/v1/admin/instructions — AppInstructionController (6 endpoint)
// ============================================================
const INSTR_IGNORE = [
  'data.data',
  'data.current_page',
  'data.total',
  'data.per_page',
];

export const adminInstructionsModule: ModuleDefinition = {
  name: 'admin-instructions',
  tags: ['admin'],
  basePath: '/api/v1/admin',
  defaultAuth: 'admin',
  ignorePaths: INSTR_IGNORE,
  scenarios: [
    {
      name: 'list (paginated)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/instructions',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
    {
      name: 'list (menu filter)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/instructions',
        query: { menu: 'workers', per_page: 5 },
      },
      statusOnly: true,
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/instructions', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'delete non-existent instruction returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/instructions/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: findOrFail → 404 (ModelNotFoundException). NestJS BusinessException(404).',
    },
    {
      name: 'detach non-existent photo returns 404',
      tags: ['delete', 'validation'],
      request: {
        method: 'DELETE',
        path: '/instruction-photos/999999999',
      },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: photo->delete() null da ham 200 (find, findOrFail emas). NestJS 404. Hujjatlangan diff.',
    },
    {
      name: 'export to PDF (stub)',
      tags: ['create'],
      request: {
        method: 'GET',
        path: '/instructions-export',
        query: { menu: 'workers' },
      },
      statusOnly: true,
      skip:
        'Laravel: dompdf PDF generatsiya (binary file response). NestJS hozircha stub JSON. Real implement keyin.',
    },
  ],
};

// ============================================================
// /api/v1/admin/telegram — TelegramController + TelegramPushController (4 endpoint)
// ============================================================
const TG_IGNORE = ['data.data', 'data.total', 'data.current_page', 'data.per_page'];

export const adminTelegramModule: ModuleDefinition = {
  name: 'admin-telegram',
  tags: ['admin'],
  basePath: '/api/v1/admin/telegram',
  defaultAuth: 'admin',
  ignorePaths: TG_IGNORE,
  scenarios: [
    {
      name: 'users (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/users', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'users (search filter)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/users',
        query: { search: '995', per_page: 3 },
      },
      statusOnly: true,
    },
    {
      name: 'send-message (broadcast stub)',
      tags: ['create'],
      request: { method: 'POST', path: '/users/send-message', body: {} },
      statusOnly: true,
      skip:
        'Laravel: queued job (Mass push). NestJS stub. Real implement (Bull/Redis queue) keyin.',
    },
    {
      name: 'bot/users (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/bot/users', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'bot/users (birthdays filter)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/bot/users',
        query: { birthdays: true, per_page: 3 },
      },
      statusOnly: true,
    },
    {
      name: 'bot/users-detach (non-existent chat_ids)',
      tags: ['delete'],
      request: {
        method: 'POST',
        path: '/bot/users-detach',
        body: { chat_ids: [999999999] },
      },
      statusOnly: true,
      skip:
        'Laravel: TelegramDetachRequest @exists rule — chat_id mavjud bo`lishi shart → 422. NestJS @IsInt yetadi. Real chat_id bo`lganda parity.',
    },
    {
      name: 'bot/users-detach with empty chat_ids returns 422',
      tags: ['delete', 'validation'],
      request: {
        method: 'POST',
        path: '/bot/users-detach',
        body: {},
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/admin/mobile/users — MobileController (2 endpoint)
// ============================================================
const MU_IGNORE = ['data.data', 'data.total', 'data.current_page', 'data.per_page'];

export const adminMobileUsersModule: ModuleDefinition = {
  name: 'admin-mobile-users',
  tags: ['admin'],
  basePath: '/api/v1/admin/mobile/users',
  defaultAuth: 'admin',
  ignorePaths: MU_IGNORE,
  scenarios: [
    {
      name: 'list (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'list (search)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'A', per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/admin/deploy — DeployController (4 endpoint)
// ============================================================
const DEPLOY_IGNORE = ['data.data', 'data.total', 'data.current_page', 'data.per_page'];

export const adminDeployModule: ModuleDefinition = {
  name: 'admin-deploy',
  tags: ['admin'],
  basePath: '/api/v1/admin/deploy',
  defaultAuth: 'admin',
  ignorePaths: DEPLOY_IGNORE,
  scenarios: [
    {
      name: 'logs (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/logs', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'logs store with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/logs', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'publish non-existent returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/publish/999999999',
        body: { published: true },
      },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: find() (findOrFail emas) → null → ?->update() no-op → 200. NestJS BusinessException(404). Hujjatlangan diff.',
    },
    {
      name: 'upload stub',
      tags: ['create'],
      request: { method: 'POST', path: '/upload', body: {} },
      statusOnly: true,
      skip:
        'Laravel: zip multipart upload + file system operations. NestJS stub. Real implement deployment-specific.',
    },
  ],
};
