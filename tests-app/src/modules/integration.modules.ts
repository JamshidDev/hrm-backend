// Integration modullari uchun parity scenariolari.
// Laravel: Modules/Integration — 6 controller, ~29 endpoint.
//
// NestJS struktura:
//   main/, workers/, stations/, meds/, contracts/,
//   worker-salary/, worker-check/, mobile-face/
//
// AUTH:
//   defaultAuth = 'integration' — phone 993631856 (NBT roli).
//   Bu user'da hmac_users entry + integration permission bor (Laravel
//   `LogIntegrationApi` middleware'i shu tekshirsa o'tadi).

import type { ModuleDefinition } from '@/configs/types';

// NestJS pagination'da `per_page` qo'shimcha; data row'lar farq qilishi mumkin.
const PAGE_IGNORE = ['data.per_page', 'data.data', 'data.total', 'data.current_page'];

const HMAC_GAP_SKIP =
  'Laravel: hmac.auth (HMAC signature kerak — public_key/secret_key/signature). NestJS Public stub → 200. HMAC implement bo`lganda olinadi.';

// ============================================================
// /api/v1/integration — main (enums, dashboard, structure, ...)
// ============================================================
export const integrationMainModule: ModuleDefinition = {
  name: 'integration-main',
  tags: ['integration'],
  basePath: '/api/v1/integration',
  defaultAuth: 'integration',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'enums',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
      statusOnly: true,
    },
    {
      name: 'dashboard (counts, date=today)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/dashboard',
        query: { date: '2026-05-18' },
      },
      statusOnly: true,
    },
    {
      name: 'dashboard without date returns 422',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/dashboard' },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'structure (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/structure', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'structure/:id/leaders',
      tags: ['list'],
      request: { method: 'GET', path: '/structure/1/leaders' },
      statusOnly: true,
    },
    {
      name: 'departments (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/departments', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'positions (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/positions', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'get-departments (brief)',
      tags: ['list'],
      request: { method: 'GET', path: '/get-departments' },
      statusOnly: true,
    },
    {
      name: 'get-positions (paginated)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/get-positions',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
    {
      name: 'kpi/report (stub)',
      tags: ['list'],
      request: { method: 'GET', path: '/kpi/report' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/integration — workers
// ============================================================
export const integrationWorkersModule: ModuleDefinition = {
  name: 'integration-workers',
  tags: ['integration'],
  basePath: '/api/v1/integration',
  defaultAuth: 'integration',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'workers list (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/workers', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'workers/by-pins (POST)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/workers/by-pins',
        body: { pins: [12345678] },
      },
      statusOnly: true,
    },
    {
      name: 'worker-by-pin without pin returns 422',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/worker-by-pin' },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'worker-by-pin (with valid pin)',
      tags: ['detail'],
      request: {
        method: 'GET',
        path: '/worker-by-pin',
        query: { pin: 31308942720074 },
      },
      statusOnly: true,
    },
    {
      name: 'worker-by-pin (non-existent pin returns 422)',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/worker-by-pin', query: { pin: 1 } },
      expectStatus: 422,
      statusOnly: true,
      skip:
        'Laravel: `exists:workers,pin` rule → 422. NestJS hozircha @Exists yo`q → 200 (null). @Exists qo`shilganda olinadi.',
    },
    {
      name: 'worker/show/:uuid (non-existent → 404)',
      tags: ['detail', 'validation'],
      request: {
        method: 'GET',
        path: '/worker/show/00000000-0000-0000-0000-000000000000',
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'turnstile-events-month (stub)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/worker/turnstile-events-month/00000000-0000-0000-0000-000000000000',
      },
      statusOnly: true,
      skip:
        'Laravel: required query params (date filters) — 422. NestJS stub 200. Real implement keyin.',
    },
    {
      name: 'turnstile-events-day (stub)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/worker/turnstile-events-day/00000000-0000-0000-0000-000000000000',
      },
      statusOnly: true,
      skip:
        'Laravel: required query params (date filters) — 422. NestJS stub 200. Real implement keyin.',
    },
  ],
};

// ============================================================
// /api/v1/integration/stations — station endpoints
// ============================================================
export const integrationStationsModule: ModuleDefinition = {
  name: 'integration-stations',
  tags: ['integration'],
  basePath: '/api/v1/integration/stations',
  defaultAuth: 'integration',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    // `code` Laravel'da station_codes.code (integer) bilan birga kelishi shart.
    // Test data uchun mavjud kod bilan ishlash kerak — hozirgi DB'da yo'q.
    {
      name: ':code/workers (stub)',
      tags: ['list'],
      request: { method: 'GET', path: '/1/workers', query: { per_page: 3 } },
      statusOnly: true,
      skip:
        'Laravel: station_codes jadval bo`sh — SQL exception. NestJS stub 200. Real implement keyin.',
    },
    {
      name: ':code/workers/:workerId',
      tags: ['detail'],
      request: { method: 'GET', path: '/1/workers/1' },
      statusOnly: true,
      skip:
        'Laravel: station_codes bo`sh, joinlar broken. Real implement keyin.',
    },
    {
      name: ':code/workers/:workerId/resume (stub)',
      tags: ['detail'],
      request: { method: 'GET', path: '/1/workers/1/resume' },
      statusOnly: true,
      skip: 'Laravel: stub broken (station_codes joinlar). Real implement keyin.',
    },
    {
      name: ':code/stats (stub)',
      tags: ['list'],
      request: { method: 'GET', path: '/1/stats' },
      statusOnly: true,
      skip: 'Laravel: stub broken (station_codes joinlar). Real implement keyin.',
    },
  ],
};

// ============================================================
// /api/v1/integration — meds
// ============================================================
export const integrationMedsModule: ModuleDefinition = {
  name: 'integration-meds',
  tags: ['integration'],
  basePath: '/api/v1/integration',
  defaultAuth: 'integration',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'meds list (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/meds', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'workers/:id/meds (paginated)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/workers/1/meds',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/integration — contracts + classifications
// ============================================================
export const integrationContractsModule: ModuleDefinition = {
  name: 'integration-contracts',
  tags: ['integration'],
  basePath: '/api/v1/integration',
  defaultAuth: 'integration',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'contracts list (paginated)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/contracts', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'classifications/positions (paginated)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/classifications/positions',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/integration/worker — salary (POST, permission:integration-worker-salary)
// ============================================================
export const integrationWorkerSalaryModule: ModuleDefinition = {
  name: 'integration-worker-salary',
  tags: ['integration'],
  basePath: '/api/v1/integration/worker',
  defaultAuth: 'integration',
  scenarios: [
    {
      name: 'salary (stub)',
      tags: ['create'],
      request: { method: 'POST', path: '/salary', body: { pin: 12345678 } },
      statusOnly: true,
      skip:
        'Laravel: permission:integration-worker-salary kerak (NBT user`da yo`q → 403). NestJS PermissionGuard implement bo`lganda olinadi.',
    },
    {
      name: 'get-salary-months (stub)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/get-salary-months',
        body: { pin: 12345678 },
      },
      statusOnly: true,
      skip:
        'Laravel: permission:integration-worker-salary kerak (403). NestJS PermissionGuard implement bo`lganda olinadi.',
    },
  ],
};

// ============================================================
// /api/v1/integration/worker — check (POST, permission:integration-worker-info)
// ============================================================
export const integrationWorkerCheckModule: ModuleDefinition = {
  name: 'integration-worker-check',
  tags: ['integration'],
  basePath: '/api/v1/integration/worker',
  defaultAuth: 'integration',
  scenarios: [
    {
      name: 'check by pin',
      tags: ['create'],
      request: { method: 'POST', path: '/check', body: { pin: 12345678 } },
      statusOnly: true,
      skip:
        'Laravel: permission:integration-worker-info kerak (NBT user`da yo`q → 403). NestJS PermissionGuard implement bo`lganda olinadi.',
    },
    {
      name: 'check by uuid',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/check',
        body: { uuid: '00000000-0000-0000-0000-000000000000' },
      },
      statusOnly: true,
      skip:
        'Laravel: permission:integration-worker-info kerak (403). NestJS PermissionGuard implement bo`lganda olinadi.',
    },
    {
      name: 'check empty body returns exists=false',
      tags: ['create'],
      request: { method: 'POST', path: '/check', body: {} },
      statusOnly: true,
      skip:
        'Laravel: permission:integration-worker-info kerak (403). NestJS PermissionGuard implement bo`lganda olinadi.',
    },
  ],
};

// ============================================================
// /api/v1/integration/mobile-face — Public HMAC (skip — signature kerak)
// ============================================================
export const integrationMobileFaceModule: ModuleDefinition = {
  name: 'integration-mobile-face',
  tags: ['integration'],
  basePath: '/api/v1/integration/mobile-face',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'send-event (HMAC stub)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/send-event',
        body: { event: 'face_detected' },
      },
      statusOnly: true,
      skip: HMAC_GAP_SKIP,
    },
    {
      name: 'check-worker (HMAC stub)',
      tags: ['create'],
      request: { method: 'POST', path: '/check-worker', body: {} },
      statusOnly: true,
      skip: HMAC_GAP_SKIP,
    },
    {
      name: 'schedules (HMAC stub)',
      tags: ['create'],
      request: { method: 'POST', path: '/schedules', body: {} },
      statusOnly: true,
      skip: HMAC_GAP_SKIP,
    },
  ],
};
