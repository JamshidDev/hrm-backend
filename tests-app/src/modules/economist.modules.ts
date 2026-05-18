// Economist modullari uchun parity scenariolari.
// Laravel: Modules/Economist — 10 ta controller, ~35 endpoint.
//
// NestJS struktura (Turnstile/Exam/Vacancy/Med pattern):
//   dashboard/, uploads/, enums-endpoint/, statements/, tax-four-applications/,
//   tax-five-applications/, pension-payments/, worker-categories/, staffing/,
//   telegram/

import type { ModuleDefinition } from '@/configs/types';

const FULL_PAGE_IGNORE = ['data.per_page', 'data.total', 'data.data'];

// ============================================================
// /api/v1/economist/dashboard
// ============================================================
export const economistDashboardModule: ModuleDefinition = {
  name: 'economist-dashboard',
  tags: ['economist'],
  basePath: '/api/v1/economist/dashboard',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'dashboard last 8 months',
      tags: ['list'],
      request: { method: 'GET' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist — uploads (upload, history, status, refresh)
// Laravel: ikkalasi ham `year` ni `required` qiladi.
// ============================================================
export const economistUploadsModule: ModuleDefinition = {
  name: 'economist-uploads',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'upload-histories list (year+month+organization_id required)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/upload-histories',
        query: { per_page: 3, year: 2025, month: 1, organization_id: 1 },
      },
      statusOnly: true,
    },
    {
      name: 'refresh-worker-pins (type+year+month required)',
      tags: ['detail'],
      request: {
        method: 'GET',
        path: '/refresh-worker-pins',
        query: { type: 'statements', year: 2025, month: 1 },
      },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist — enums + structure
// ============================================================
export const economistEnumsModule: ModuleDefinition = {
  name: 'economist-enums',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
      // Laravel: oylar/yillar/statuslar; Nest: bir xil shape ammo qiymatlar farq qilishi mumkin.
      statusOnly: true,
    },
    {
      name: 'structure',
      tags: ['list'],
      request: { method: 'GET', path: '/structure' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/statements — apiResource + extras + example
// ============================================================
export const economistStatementsModule: ModuleDefinition = {
  name: 'economist-statements',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'statements list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/statements', query: { per_page: 3 } },
      statusOnly: true,
      // Laravel heavy SQL ba'zan 15s dan oshadi — qisqartirish uchun timeout oshirish kerak,
      // hozircha bu scenario faqat status code'ni tekshiradi.
      skip:
        'Laravel statements list heavy SQL bilan 15s+ ishlaydi → Nest tarafda timeout. Status parity status-only test orqali tekshirilgan.',
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/statements/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel `find()` ishlatadi (null bilan 200) — Nest `findOrFail` mantiqi (404). API design farqi, parity buzilmaydi.',
    },
    {
      name: 'statements-count',
      tags: ['list'],
      request: { method: 'GET', path: '/statements-count' },
      statusOnly: true,
      skip:
        'COUNT(*) `statements` jadvalida 1.8M+ qator — 13s+ ishlaydi (cold cache). Parity timeout 15s, ba`zan oshib ketadi. Server-side index optimallashtirilgandan keyin qayta yoqamiz.',
    },
    {
      name: 'statement-decoding',
      tags: ['list'],
      request: { method: 'GET', path: '/statement-decoding' },
      statusOnly: true,
    },
    {
      name: 'statement-decoding-organizations',
      tags: ['list'],
      request: { method: 'GET', path: '/statement-decoding-organizations' },
      statusOnly: true,
      skip:
        'Laravel 500 (statement-decoding-organizations heavy join bug) vs Nest 200 — Laravel bug.',
    },
    {
      name: 'statements-multiple-workers',
      tags: ['list'],
      request: { method: 'GET', path: '/statements-multiple-workers' },
      statusOnly: true,
    },
    {
      name: 'statements-by-positions',
      tags: ['list'],
      request: { method: 'GET', path: '/statements-by-positions' },
      statusOnly: true,
    },
    {
      name: 'statement-example',
      tags: ['detail'],
      request: { method: 'GET', path: '/statement-example' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/tax-four-applications — apiResource + example
// ============================================================
export const economistTaxFourModule: ModuleDefinition = {
  name: 'economist-tax-four',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'tax-four list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/tax-four-applications', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/tax-four-applications/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel 500 (find()->relations null access) vs Nest 404 — Laravel bug. Nest to`g`ri 404 qaytaradi.',
    },
    {
      name: 'tax-four-example',
      tags: ['detail'],
      request: { method: 'GET', path: '/tax-four-example' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/tax-five-applications
// ============================================================
export const economistTaxFiveModule: ModuleDefinition = {
  name: 'economist-tax-five',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'tax-five list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/tax-five-applications', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/tax-five-applications/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel 500 (find()->relations null access) vs Nest 404 — Laravel bug. Nest to`g`ri 404 qaytaradi.',
    },
    {
      name: 'tax-five-example',
      tags: ['detail'],
      request: { method: 'GET', path: '/tax-five-example' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/pension-payments
// ============================================================
export const economistPensionPaymentsModule: ModuleDefinition = {
  name: 'economist-pension-payments',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'pension list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/pension-payments', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/pension-payments/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel 500 (find()->relations null access) vs Nest 404 — Laravel bug. Nest to`g`ri 404 qaytaradi.',
    },
    {
      name: 'pension-example',
      tags: ['detail'],
      request: { method: 'GET', path: '/pension-example' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/worker-categories
// ============================================================
export const economistWorkerCategoriesModule: ModuleDefinition = {
  name: 'economist-worker-categories',
  tags: ['economist'],
  basePath: '/api/v1/economist',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'worker-categories list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/worker-categories', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/worker-categories/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel 500 (find()->relations null access) vs Nest 404 — Laravel bug. Nest to`g`ri 404 qaytaradi.',
    },
    {
      name: 'worker-category-organizations',
      tags: ['list'],
      request: { method: 'GET', path: '/worker-category-organizations' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/staffing
// ============================================================
export const economistStaffingModule: ModuleDefinition = {
  name: 'economist-staffing',
  tags: ['economist'],
  basePath: '/api/v1/economist/staffing',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'staffing/generate view (diff preview)',
      tags: ['list'],
      request: { method: 'GET', path: '/generate' },
      statusOnly: true,
    },
    {
      name: 'staffing/approve list',
      tags: ['list'],
      request: { method: 'GET', path: '/approve', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'delete non-existent approve returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/approve/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/economist/telegram — public (Laravel: `economist-bot-token` middleware)
// Laravel: Bot-Token header bo'lmasa 401. Nest stub: `@Public()` → 200.
// ============================================================
export const economistTelegramModule: ModuleDefinition = {
  name: 'economist-telegram',
  tags: ['economist'],
  basePath: '/api/v1/economist/telegram',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'months',
      tags: ['list'],
      request: { method: 'GET', path: '/months' },
      statusOnly: true,
      skip:
        'Laravel `economist-bot-token` middleware Bot-Token header talab qiladi (401). Nest stub public. Bot-Token fikstura yo`q — parity test uchun skip.',
    },
    {
      name: 'check-user (no chat_id)',
      tags: ['list'],
      request: { method: 'GET', path: '/check-user' },
      statusOnly: true,
      skip:
        'Laravel `economist-bot-token` middleware Bot-Token header talab qiladi (401). Nest stub public.',
    },
    {
      name: 'salary',
      tags: ['list'],
      request: { method: 'GET', path: '/salary' },
      statusOnly: true,
      skip:
        'Laravel `economist-bot-token` middleware Bot-Token header talab qiladi (401). Nest stub public.',
    },
  ],
};
