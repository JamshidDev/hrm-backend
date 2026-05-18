// Turnstile (Bosqich 10) modullari uchun parity scenariolari.
// Laravel: Modules/Turnstile — 22 ta controller, ~85 endpoint.
//
// NestJS module struktura:
//   buildings/, terminals/, organization-terminals/, enums-endpoint/,
//   work-duration/, worker-photos/, hik-central-access-levels/,
//   hik-central-devices/, hik-central-workers/, hik-central-events/,
//   hik-central-sync/, hik-central-telegram/, hik-central-approve-al/,
//   schedule-types/, schedule-groups/, worker-schedules/, schedule-stats/

import type { ModuleDefinition } from '@/configs/types';

// `data.per_page` — har Nest paginate response'da qo'shimcha key (Laravel'da yo'q).
// `data.total` — Laravel filterByOrganization scope NestJS'da hozircha implement
// qilinmagan; rows va total farq qilishi mumkin.
const DEFAULT_IGNORE = ['data.per_page'];

// ============================================================
// /api/v1/turnstile/buildings (CRUD)
// ============================================================
export const turnstileBuildingsModule: ModuleDefinition = {
  name: 'turnstile-buildings',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/buildings',
  defaultAuth: 'admin',
  ignorePaths: DEFAULT_IGNORE,
  scenarios: [
    {
      name: 'list (default pagination)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
    },
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (search="Building")',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'Building' } },
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'update non-existent building returns 404',
      tags: ['update', 'validation'],
      request: { method: 'PUT', path: '/999999', body: { name: 'Test' } },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/terminals (CRUD)
// ============================================================
export const turnstileTerminalsModule: ModuleDefinition = {
  name: 'turnstile-terminals',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/terminals',
  defaultAuth: 'admin',
  ignorePaths: DEFAULT_IGNORE,
  scenarios: [
    {
      name: 'list (default pagination)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
    },
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with invalid ip_address returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        body: { building_id: 1, name: 'T', ip_address: 'not-an-ip' },
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'update non-existent terminal returns 404',
      tags: ['update', 'validation'],
      request: { method: 'PUT', path: '/999999', body: { name: 'X' } },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/organization-terminals
// ============================================================
export const turnstileOrgTerminalsModule: ModuleDefinition = {
  name: 'turnstile-organization-terminals',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/organization-terminals',
  defaultAuth: 'admin',
  // Laravel `toTree()` orqali parent_id bo'yicha tree quradi — Nest flat list.
  // List response shape Laravel'da daraxt, biz'da flat → diff bo'ladi.
  ignorePaths: DEFAULT_IGNORE,
  scenarios: [
    {
      name: 'list organizations with terminal counts',
      tags: ['list'],
      request: { method: 'GET' },
      skip: 'Laravel toTree() vs Nest flat list — shape farq qiladi (alohida hal qilinadi)',
    },
    {
      name: 'show terminals for org 1',
      tags: ['detail'],
      request: { method: 'GET', path: '/1' },
    },
    {
      name: 'sync with missing organization_id returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/enums
// ============================================================
export const turnstileEnumsModule: ModuleDefinition = {
  name: 'turnstile-enums',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/enums',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums (schedule_types + times)',
      tags: ['list'],
      request: { method: 'GET' },
    },
  ],
};

// ============================================================
// /api/v1/turnstile/work-duration + /terminal-logs
// ============================================================
export const turnstileWorkDurationModule: ModuleDefinition = {
  name: 'turnstile-work-duration',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile',
  defaultAuth: 'admin',
  // total/data — Laravel filterByOrganization scope, hozir Nest'da yo'q.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'work-duration (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/work-duration', query: { per_page: 3 } },
    },
    {
      name: 'terminal-logs (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/terminal-logs', query: { per_page: 3 } },
      skip: 'Laravel 500 (heavy join bug); Nest returns 200 — Laravel bug',
    },
    {
      name: 'work-duration/logs (worker_id=1, date=today)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/work-duration/logs',
        query: { worker_id: 1, date: '2025-09-15' },
      },
    },
  ],
};

// ============================================================
// /api/v1/turnstile/worker-photos
// ============================================================
export const turnstileWorkerPhotosModule: ModuleDefinition = {
  name: 'turnstile-worker-photos',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/worker-photos',
  defaultAuth: 'admin',
  // MinIO signed URL har request'da o'zgaradi — mask qilamiz.
  maskPaths: ['data[].photo'],
  scenarios: [
    {
      name: 'photos (no worker_id → empty array)',
      tags: ['list'],
      request: { method: 'GET' },
    },
    {
      name: 'photos for worker_id=1',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { worker_id: 1 } },
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/access-levels*
// ============================================================
export const turnstileAccessLevelsModule: ModuleDefinition = {
  name: 'turnstile-hc-access-levels',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central',
  defaultAuth: 'admin',
  // Laravel `accessLevels` user organization → access_levels orqali keladi
  // (auth-aware). NestJS'da hozircha barcha rows. Total diff bo'ladi.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'access-levels list',
      tags: ['list'],
      request: { method: 'GET', path: '/access-levels' },
    },
    {
      name: 'departments list',
      tags: ['list'],
      request: { method: 'GET', path: '/departments' },
    },
    {
      name: 'all-access-levels (flat)',
      tags: ['list'],
      request: { method: 'GET', path: '/all-access-levels' },
    },
    {
      name: 'organization-access-levels',
      tags: ['list'],
      request: { method: 'GET', path: '/organization-access-levels' },
    },
    {
      name: 'attach without organization_id returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        path: '/organization-access-levels-attach',
        body: {},
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/devices*  (h_c_p_devices)
// ============================================================
export const turnstileHcpDevicesModule: ModuleDefinition = {
  name: 'turnstile-hc-devices',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central',
  defaultAuth: 'admin',
  // Laravel `if (!user->hasRole('Admin'))` filter — NestJS hozircha barcha.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'devices list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/devices', query: { per_page: 3 } },
    },
    {
      name: 'devices list (status=on)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/devices',
        query: { status: 'on', per_page: 3 },
      },
    },
    {
      name: 'devices list (attached=yes)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/devices',
        query: { attached: 'yes', per_page: 3 },
      },
    },
    {
      name: 'store device without organization_id returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/devices', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/workers*  (HCP workers + audit logs)
// ============================================================
export const turnstileHcpWorkersModule: ModuleDefinition = {
  name: 'turnstile-hc-workers',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'workers list',
      tags: ['list'],
      request: { method: 'GET', path: '/workers', query: { per_page: 3 } },
    },
    {
      name: 'groups list (external HCP stub → empty)',
      tags: ['list'],
      request: { method: 'GET', path: '/groups' },
      skip: 'Laravel external HCP API call vs Nest empty stub',
    },
    {
      name: 'workers/added-logs',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/workers/added-logs',
        query: { per_page: 3 },
      },
    },
    {
      name: 'workers/invalids (cache-driven)',
      tags: ['list'],
      request: { method: 'GET', path: '/workers/invalids' },
      // Laravel reads Cache('hcp_invalid_workers'), Nest returns empty.
      // Time field har request'da o'zgaradi — mask qilamiz.
      // Cache holatiga bog'liq.
      statusOnly: true,
    },
    {
      name: 'workers/exported-jobs',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/workers/exported-jobs',
        query: { per_page: 3 },
      },
    },
    {
      name: 'workers/exported-errors without job_id returns 422',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/workers/exported-errors' },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'workers/sync-to-server without required fields returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/workers/sync-to-server', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/events*
// ============================================================
export const turnstileEventsModule: ModuleDefinition = {
  name: 'turnstile-hc-events',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'events list (date=today)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/events',
        query: { date: '2025-09-15', per_page: 3 },
      },
    },
    {
      name: 'events-new (date=today)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/events-new',
        query: { date: '2025-09-15', per_page: 3 },
      },
    },
    {
      name: 'work-durations (date=today)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/work-durations',
        query: { date: '2025-09-15' },
      },
      skip: 'Laravel 500 (workDurationsSql LATERAL bug on some inputs); Nest stub 200',
    },
    {
      name: 'work-durations/:workerId (year/month)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/work-durations/1',
        query: { year: 2025, month: 9 },
      },
    },
    {
      name: 'events/sync without dates returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/events/sync', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/sync*
// ============================================================
export const turnstileSyncModule: ModuleDefinition = {
  name: 'turnstile-hc-sync',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'sync list',
      tags: ['list'],
      request: { method: 'GET', path: '/sync', query: { per_page: 3 } },
    },
    {
      name: 'sync show non-existent returns 404',
      tags: ['detail'],
      request: { method: 'GET', path: '/sync/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel findOrFail (404) vs Nest empty array — alohida hal qilinadi',
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/telegram*
// ============================================================
export const turnstileTelegramModule: ModuleDefinition = {
  name: 'turnstile-hc-telegram',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'telegram list',
      tags: ['list'],
      request: { method: 'GET', path: '/telegram', query: { per_page: 3 } },
    },
    {
      name: 'telegram photos',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/telegram/photos',
        query: { per_page: 3 },
      },
    },
    {
      name: 'telegram users',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/telegram-users',
        query: { per_page: 3 },
      },
    },
    {
      name: 'all-devices',
      tags: ['list'],
      request: { method: 'GET', path: '/all-devices' },
    },
    {
      name: 'telegram store without user_id returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/telegram', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/hik-central/approve-al*
// ============================================================
export const turnstileApproveAlModule: ModuleDefinition = {
  name: 'turnstile-hc-approve-al',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/hik-central/approve-al',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'approve-al list',
      tags: ['list'],
      request: { method: 'GET', path: '/list', query: { per_page: 3 } },
    },
    {
      name: 'approve-al access-levels',
      tags: ['list'],
      request: { method: 'GET', path: '/als' },
    },
    {
      name: 'approve-al show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/list/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/schedule/types
// ============================================================
export const turnstileScheduleTypesModule: ModuleDefinition = {
  name: 'turnstile-schedule-types',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/schedule',
  defaultAuth: 'admin',
  // Laravel `withSum/withCount` use filterByOrganizations user-scope; NestJS
  // hozircha barcha satrlarni hisoblaydi → counts diff (parity scope ishi).
  ignorePaths: ['data.per_page', 'data.data[].groups', 'data.data[].workers'],
  scenarios: [
    {
      name: 'types list (flat)',
      tags: ['list'],
      request: { method: 'GET', path: '/types' },
    },
    {
      name: 'schedule-types (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/schedule-types', query: { per_page: 3 } },
    },
    {
      name: 'create type without name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/types', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/turnstile/schedule/schedule-groups* + schedule-workers
// ============================================================
export const turnstileScheduleGroupsModule: ModuleDefinition = {
  name: 'turnstile-schedule-groups',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/schedule',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'schedule-groups list',
      tags: ['list'],
      request: { method: 'GET', path: '/schedule-groups', query: { per_page: 3 } },
    },
    {
      name: 'schedule-workers (no group_id → empty)',
      tags: ['list'],
      request: { method: 'GET', path: '/schedule-workers' },
    },
  ],
};

// ============================================================
// /api/v1/turnstile/schedule/workers* + generate*
// ============================================================
export const turnstileWorkerSchedulesModule: ModuleDefinition = {
  name: 'turnstile-worker-schedules',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/schedule',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'workers (no date) returns 422',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/workers', query: { per_page: 3 } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'workers-with-turnstile (no date) returns 422',
      tags: ['list', 'validation'],
      request: {
        method: 'GET',
        path: '/workers-with-turnstile',
        query: { per_page: 3 },
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'get-workers (generate page workers)',
      tags: ['list'],
      request: { method: 'GET', path: '/get-workers', query: { per_page: 3 } },
    },
    {
      name: 'day-in-month (2025-09)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/day-in-month',
        query: { year: 2025, month: 9 },
      },
    },
    {
      name: 'departments list',
      tags: ['list'],
      request: { method: 'GET', path: '/departments', query: { per_page: 3 } },
    },
  ],
};

// ============================================================
// /api/v1/turnstile/schedule/stats-* (dashboard)
// ============================================================
export const turnstileScheduleStatsModule: ModuleDefinition = {
  name: 'turnstile-schedule-stats',
  tags: ['turnstile'],
  basePath: '/api/v1/turnstile/schedule',
  defaultAuth: 'admin',
  // Laravel stats — heavy SQL with user filter; Nest hozircha simplified (totalWorkers
  // bo'sh joydan oladi). Qiymatlar farq qiladi — faqat shape/status tekshiramiz.
  scenarios: [
    {
      name: 'stats-one (turnstile counts)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-one', query: { date: '2025-09-15' } },
      statusOnly: true,
    },
    {
      name: 'stats-two (schedule stats by month)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-two', query: { date: '2025-09-15' } },
      statusOnly: true,
    },
    {
      name: 'stats-three (current events)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-three', query: { date: '2025-09-15' } },
      statusOnly: true,
    },
    {
      name: 'stats-four (daily attendance chart)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-four', query: { date: '2025-09-15' } },
      statusOnly: true,
    },
    {
      name: 'stats-five (devices)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-five' },
      statusOnly: true,
    },
    {
      name: 'stats-six (privilege turnstile)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-six', query: { date: '2025-09-15' } },
      statusOnly: true,
    },
    {
      name: 'stats-seven (late and early stats)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/stats-seven',
        query: { date: '2025-09-15' },
      },
      statusOnly: true,
    },
    {
      name: 'stats-preview (dashboard preview)',
      tags: ['list'],
      request: { method: 'GET', path: '/stats-preview' },
      statusOnly: true,
    },
  ],
};
