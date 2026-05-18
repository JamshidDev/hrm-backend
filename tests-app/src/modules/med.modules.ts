// Med modullari uchun parity scenariolari.
// Laravel: Modules/Med — 3 ta controller, ~16 endpoint.
//
// NestJS struktura (Turnstile/Exam/Vacancy pattern):
//   med-workers/, sended-workers/, worker-positions/, pensioners/, hospital/
//
// ESLATMA: Med endpointlari poliklinika kontekstiga bog'liq (user.organization_id
// orqali organization_polyclinics). Test user'i poliklinika bo'lmasa, ko'p
// endpoint bo'sh ro'yxat qaytaradi — `statusOnly` bilan tekshiramiz.

import type { ModuleDefinition } from '@/configs/types';

const FULL_PAGE_IGNORE = ['data.per_page', 'data.total', 'data.data'];

// ============================================================
// /api/v1/med — MedController (workers, polyclinics, dashboard, organizations)
// ============================================================
export const medWorkersModule: ModuleDefinition = {
  name: 'med-workers',
  tags: ['med'],
  basePath: '/api/v1/med',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'workers list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/workers', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'polyclinics list',
      tags: ['list'],
      request: { method: 'GET', path: '/polyclinics' },
      statusOnly: true,
    },
    {
      name: 'dashboard stats',
      tags: ['detail'],
      request: { method: 'GET', path: '/dashboard' },
      statusOnly: true,
    },
    {
      name: 'organizations list',
      tags: ['list'],
      request: { method: 'GET', path: '/organizations' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/med — sended workers (send-to-med, sended-workers, destroy)
// ============================================================
export const medSendedWorkersModule: ModuleDefinition = {
  name: 'med-sended-workers',
  tags: ['med'],
  basePath: '/api/v1/med',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'sended-workers list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/sended-workers', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'send-to-med with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/send-to-med', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'delete non-existent sended worker returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/sended-workers/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel 500 (find()->status null access) vs Nest 404 — Laravel bug',
    },
  ],
};

// ============================================================
// /api/v1/med/worker-positions — WorkerController
// ============================================================
export const medWorkerPositionsModule: ModuleDefinition = {
  name: 'med-worker-positions',
  tags: ['med'],
  basePath: '/api/v1/med/worker-positions',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'worker-positions list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/med/pensioners — PensionerController->listMed
// ============================================================
export const medPensionersModule: ModuleDefinition = {
  name: 'med-pensioners',
  tags: ['med'],
  basePath: '/api/v1/med/pensioners',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'pensioners list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'pensioners list (search)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'test', per_page: 3 } },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/med/hospital — SendedWorkerController
// ============================================================
export const medHospitalModule: ModuleDefinition = {
  name: 'med-hospital',
  tags: ['med'],
  basePath: '/api/v1/med/hospital',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'tickets list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/tickets', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'ticket commissions',
      tags: ['list'],
      request: { method: 'GET', path: '/tickets/1/commissions' },
      statusOnly: true,
    },
    {
      name: 'tickets-attach with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/tickets-attach', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'detach non-existent commission returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/tickets-attach/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel 500 (find()->status null access) vs Nest 404 — Laravel bug',
    },
    {
      name: 'confirm with empty body returns 422',
      tags: ['update', 'validation'],
      request: { method: 'POST', path: '/tickets/999999/confirm', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};
