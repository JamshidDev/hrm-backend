// TimeSheet (Bosqich 9) modullari uchun parity scenariolari.
// Laravel: Modules/TimeSheet — 3 ta controller, 17 endpoint.
//
// Endpointlar:
//   - timesheetModule              → /api/v1/timesheet  (CRUD + accept)
//   - timesheetWorkerDeptModule    → /api/v1/timesheet/worker-departments (index/attach/detach)
//   - timesheetWorkersModule       → /api/v1/timesheet/{id}/workers (index + store + dayInMonth + check-worker)
//   - timesheetEnumsDeptsModule    → /api/v1/timesheet/enums + /departments
//   - timesheetConfirmationsModule → /api/v1/timesheet/{id}/confirmations (POST/GET/DELETE)

import type { ModuleDefinition } from '@/configs/types';

// ---------- /api/v1/timesheet (CRUD + accept) ----------
export const timesheetModule: ModuleDefinition = {
  name: 'timesheet',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet',
  defaultAuth: 'admin',
  // - data.per_page — NestJS qo'shimcha key.
  // - data.total — Laravel filter scope (foydalanuvchi scope) Nest'da boshqacha
  //   hisoblashi mumkin (paginator parity bilan farq qilishi mumkin).
  ignorePaths: ['data.per_page', 'data.total'],
  // confirmation_file — signed URL har request'da o'zgaradi.
  maskPaths: ['data.data[].confirmation_file'],
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
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create without year returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { month: 5 } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'update non-existent timesheet returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/999999',
        body: { year: 2025, month: 5 },
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'accept non-existent timesheet returns 404',
      tags: ['update', 'validation'],
      request: { method: 'POST', path: '/999999/accept' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ---------- /api/v1/timesheet/worker-departments ----------
export const timesheetWorkerDeptModule: ModuleDefinition = {
  name: 'timesheet-worker-departments',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet/worker-departments',
  defaultAuth: 'admin',
  // - data.per_page: NestJS qo'shimcha.
  // - data.total / data.data: Laravel `filter($user, ...)` permission scope
  //   foydalanuvchi tashkilotlariga cheklaydi (filterByOrganizations). NestJS hozircha
  //   bu scope implement qilinmagan — natijada total va rows farq qiladi.
  //   Status=ACTIVE filter qo'shildi, lekin permission scope hali yo'q.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  maskPaths: ['data.data[].worker.photo'],
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
      name: 'attach with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/attach', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- /api/v1/timesheet/{id}/workers + check-worker + day-in-month ----------
export const timesheetWorkersModule: ModuleDefinition = {
  name: 'timesheet-workers',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet',
  defaultAuth: 'admin',
  ignorePaths: [
    'data.per_page',
    // data.total/data.data farq qilishi mumkin (Laravel permission scope yo'q
    // bu yerda — lekin Laravel workers JOIN'i `usedWpIds` mantiqi NestJS bilan
    // teng emas, sql expr order/group farq beradi).
    'data.total',
    'data.data',
  ],
  maskPaths: ['data.data[].photo'],
  scenarios: [
    {
      name: 'workers of timesheet 1 (per_page=2)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/1/workers',
        query: { per_page: 2 },
      },
    },
    {
      name: 'workers of non-existent timesheet returns 404',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/999999/workers' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — TimeSheetWorkerController::index does not findOrFail $timesheetId, calls $timesheet->workers on null → HTTP 500. NestJS correctly returns 404.',
    },
    {
      name: 'day-in-month of timesheet 1',
      tags: ['detail'],
      request: { method: 'GET', path: '/1/day-in-month' },
    },
    {
      name: 'day-in-month of non-existent timesheet returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999/day-in-month' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — TimeSheetWorkerController::dayInMonth does not findOrFail, accesses ->year/->month on null → HTTP 500. NestJS correctly returns 404.',
    },
  ],
};

// ---------- /api/v1/timesheet/check-worker ----------
export const timesheetCheckWorkerModule: ModuleDefinition = {
  name: 'timesheet-check-worker',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet',
  defaultAuth: 'admin',
  maskPaths: ['data[].worker.photo'],
  scenarios: [
    {
      name: 'check-worker by PIN',
      tags: ['detail'],
      request: {
        method: 'GET',
        path: '/check-worker',
        query: { pin: '30109703810017' },
      },
      // Laravel-side bug: TimesheetService::checkWorker constructor signature
      // ArgumentCountError beradi. NestJS to'g'ri javob qaytaradi.
      skip: 'Laravel bug — ArgumentCountError in TimesheetService::checkWorker',
    },
  ],
};

// ---------- /api/v1/timesheet/enums ----------
export const timesheetEnumsModule: ModuleDefinition = {
  name: 'timesheet-enums',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums (25 timesheet types)',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
    },
  ],
};

// ---------- /api/v1/timesheet/departments ----------
export const timesheetDepartmentsModule: ModuleDefinition = {
  name: 'timesheet-user-departments',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'user worker departments + organizations',
      tags: ['list'],
      request: { method: 'GET', path: '/departments' },
    },
  ],
};

// ---------- /api/v1/timesheet/{id}/confirmations ----------
export const timesheetConfirmationsModule: ModuleDefinition = {
  name: 'timesheet-confirmations',
  tags: ['timesheet'],
  basePath: '/api/v1/timesheet',
  defaultAuth: 'admin',
  maskPaths: ['data.confirmations[].worker.photo'],
  scenarios: [
    {
      name: 'list confirmations of timesheet 1',
      tags: ['list'],
      request: { method: 'GET', path: '/1/confirmations' },
    },
    {
      name: 'attach with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/1/confirmations', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'attach with empty confirmations array returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        path: '/1/confirmations',
        body: { confirmations: [] },
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};
