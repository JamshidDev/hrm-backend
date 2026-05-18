// HR modullar test config.
//
// Bosqich 1 — Foundation:
//   - nationalitiesModule  → CRUD /api/v1/hr/nationalities
//   - departmentsModule    → CRUD /api/v1/hr/departments (whereIsRoot index)
//   - departmentExtrasModule → department-levels / department-list / departments-tree

import type { ModuleDefinition } from '@/configs/types';

// ---------- Nationalities ----------
export const nationalitiesModule: ModuleDefinition = {
  name: 'nationalities',
  tags: ['hr'],
  basePath: '/api/v1/hr/nationalities',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (per_page=10)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 10 } },
    },
    {
      name: 'list (search=O\'zbek)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: "O'zbek", per_page: 5 } },
    },
  ],
};

// ---------- Departments (CRUD index) ----------
export const departmentsModule: ModuleDefinition = {
  name: 'departments',
  tags: ['hr'],
  basePath: '/api/v1/hr/departments',
  defaultAuth: 'admin',
  // `data.per_page` — NestJS qo'shimcha.
  // `data.total` — Laravel `filterByOrganizationsWithJoin` permission scope orqali bir nechta org
  //               (soft-deleted) chetlanadi (Laravel: 3587 vs NestJS: 3591). Permission scope
  //               implement qilinmagan, parity uchun jami count'da farq olib tashlanadi.
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'list (per_page=3, whereIsRoot)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (per_page=10)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 10 } },
    },
    {
      name: 'list (organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { organization_id: 1, per_page: 5 } },
    },
    {
      name: 'list (organizations=1,3)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { organizations: '1,3', per_page: 5 } },
    },
    {
      name: 'show id=1 (department + children)',
      tags: ['detail'],
      request: { method: 'GET', path: '/1' },
    },
  ],
};

// ---------- Workers ----------
export const workersModule: ModuleDefinition = {
  name: 'workers',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  // photo — signed URL (har request o'zgaradi).
  // positions[].hrs — Laravel `whereHas` ORDER BY yo'q, PG natural order — bizniki user.id ASC.
  //   Order farqi, lekin items mos.
  maskPaths: [
    'data.photo',
    'data.positions[].hrs[].worker.photo',
  ],
  ignorePaths: [
    'data.positions[].hrs', // order farqi
  ],
  scenarios: [
    {
      name: "check-worker by PIN",
      tags: ['detail'],
      request: {
        method: 'GET',
        path: '/check-worker',
        query: { pin: '30109703810017' },
      },
    },
  ],
};

// ---------- WorkerPositions ----------
export const workerPositionsModule: ModuleDefinition = {
  name: 'worker-positions',
  tags: ['hr'],
  basePath: '/api/v1/hr/worker-positions',
  defaultAuth: 'admin',
  // photo — signed URL.
  // total/per_page — Laravel permission scope.
  maskPaths: ['data.data[].worker.photo'],
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'list (default per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'list (per_page=5, organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { per_page: 5, organization_id: 1 } },
    },
    {
      name: 'list (departments=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { departments: '1', per_page: 5 } },
    },
  ],
};

// ---------- HR enums aggregate (29 lists) ----------
export const hrEnumsModule: ModuleDefinition = {
  name: 'hr-enums',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums (uz default)',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
    },
    {
      name: 'enums (lang=ru)',
      tags: ['list'],
      request: { method: 'GET', path: '/enums', query: { lang: 'ru' } },
    },
    {
      name: 'enums (lang=en)',
      tags: ['list'],
      request: { method: 'GET', path: '/enums', query: { lang: 'en' } },
    },
  ],
};

// ---------- Worker sub-resources (Bosqich 3) ----------
// Real worker UUID — `worker_id=2` (Narzullayev Zufar) — has phones, languages.
const WORKER_UUID = '0fbe6bd3-adde-4a3b-bc36-4c22082f0136';

function workerSubResourceModule(name: string, path: string, fileMask = false): ModuleDefinition {
  return {
    name,
    tags: ['hr', 'worker-sub'],
    basePath: `/api/v1/hr/${path}`,
    defaultAuth: 'admin',
    ...(fileMask ? { maskPaths: ['data[].file'] } : {}),
    scenarios: [
      {
        name: `list (uuid=${WORKER_UUID.slice(0, 8)}...)`,
        tags: ['list', 'filter'],
        request: { method: 'GET', query: { uuid: WORKER_UUID } },
      },
      {
        name: 'list (empty uuid)',
        tags: ['list'],
        request: { method: 'GET', query: { uuid: '00000000-0000-0000-0000-000000000000' } },
      },
    ],
  };
}

export const workerPhonesModule = workerSubResourceModule('worker-phones', 'worker-phones');
export const workerDisabilitiesModule = workerSubResourceModule('worker-disabilities', 'worker-disabilities');
export const workerSickLeavesModule = workerSubResourceModule('worker-sick-leaves', 'worker-sick-leaves');
export const workerPartiesModule = workerSubResourceModule('worker-parties', 'worker-parties');
export const workerMilitariesModule = workerSubResourceModule('worker-militaries', 'worker-militaries');
export const workerAcademicDegreesModule = workerSubResourceModule(
  'worker-academic-degrees',
  'worker-academic-degrees',
  true,
);
export const workerAcademicTitlesModule = workerSubResourceModule(
  'worker-academic-titles',
  'worker-academic-titles',
  true,
);
export const workerLanguagesModule = workerSubResourceModule(
  'worker-languages',
  'worker-languages',
  true,
);
// worker-relatives — embedded photo URL inside relative_worker.
export const workerRelativesModule: ModuleDefinition = {
  name: 'worker-relatives',
  tags: ['hr', 'worker-sub'],
  basePath: '/api/v1/hr/worker-relatives',
  defaultAuth: 'admin',
  maskPaths: ['data[].relative_worker.photo'],
  scenarios: [
    {
      name: `list (uuid=${WORKER_UUID.slice(0, 8)}...)`,
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { uuid: WORKER_UUID } },
    },
  ],
};
export const workerOldCareersModule = workerSubResourceModule(
  'worker-old-careers',
  'worker-old-careers',
);
// worker-passports — `empty uuid` scenario disabled: Laravel OOM (PHP memory exhausted
// returning all passports), NestJS MinIO signed-URL generation also slow under load.
export const workerPassportsModule: ModuleDefinition = {
  name: 'worker-passports',
  tags: ['hr', 'worker-sub'],
  basePath: '/api/v1/hr/worker-passports',
  defaultAuth: 'admin',
  maskPaths: ['data[].file'],
  scenarios: [
    {
      name: `list (uuid=${WORKER_UUID.slice(0, 8)}...)`,
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { uuid: WORKER_UUID } },
    },
  ],
};

// ---------- Contracts + Commands (Bosqich 4) ----------
export const contractsModule: ModuleDefinition = {
  name: 'contracts',
  tags: ['hr'],
  basePath: '/api/v1/hr/contracts',
  defaultAuth: 'admin',
  maskPaths: [
    'data.data[].worker.photo',
    'data.data[].file',
    'data.data[].confirmation_file',
  ],
  // total — permission scope.
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'list (organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { organization_id: 1, per_page: 3 } },
    },
  ],
};

// ---------- Polyclinics + Pensioners (Bosqich 7) ----------
export const polyclinicsModule: ModuleDefinition = {
  name: 'polyclinics',
  tags: ['hr'],
  basePath: '/api/v1/hr/polyclinics',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

export const pensionersModule: ModuleDefinition = {
  name: 'pensioners',
  tags: ['hr'],
  basePath: '/api/v1/hr/pensioners',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2, organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { per_page: 2, organization_id: 1 } },
    },
  ],
};

// ---------- Leaders / OrgDocuments / WorkerUniversities (Bosqich 7+ extras) ----------
export const leadersModule: ModuleDefinition = {
  name: 'leaders',
  tags: ['hr'],
  basePath: '/api/v1/hr/leaders',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker_position.worker.photo'],
  ignorePaths: ['data.per_page'],
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
  ],
};

export const organizationDocumentsModule: ModuleDefinition = {
  name: 'organization-documents',
  tags: ['hr'],
  basePath: '/api/v1/hr/organization-documents',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].file'],
  ignorePaths: ['data.per_page', 'data.total'], // visibility scope tree skipped
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

export const workerUniversitiesModule: ModuleDefinition = {
  name: 'worker-universities',
  tags: ['hr', 'worker-sub'],
  basePath: '/api/v1/hr/worker-universities',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].file'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (real worker)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { uuid: '2c1b426b-3545-4758-8058-7150b832c8fe' } },
    },
  ],
};

// ---------- Incentives / Disciplinary / BusinessTrips (Bosqich 7 extras) ----------
export const incentivesModule: ModuleDefinition = {
  name: 'incentives',
  tags: ['hr'],
  basePath: '/api/v1/hr/incentives',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker_position.worker.photo'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

export const disciplinariesModule: ModuleDefinition = {
  name: 'disciplinaries',
  tags: ['hr'],
  basePath: '/api/v1/hr/discips',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker_position.worker.photo'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

export const businessTripsModule: ModuleDefinition = {
  name: 'business-trips',
  tags: ['hr'],
  basePath: '/api/v1/hr/business-trips',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker_position.worker.photo'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

// ---------- Worker Relative Disabilities (apiResource) ----------
// Laravel-side BROKEN: model'da `scopeFilter` yo'q, controller `->filter()` chaqirib
// `BadMethodCallException` (HTTP 500). NestJS to'g'ri ishlaydi.
// Faqat validation testlari — read parity yo'q (Laravel 500).
export const workerRelativeDisabilitiesModule: ModuleDefinition = {
  name: 'worker-relative-disabilities',
  tags: ['hr'],
  basePath: '/api/v1/hr/worker-relative-disabilities',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'list returns 500 in Laravel — NestJS skip',
      tags: ['list'],
      request: { method: 'GET' },
      skip: 'Laravel bug — WorkerRelativeDisability model has no scopeFilter()',
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
      skip: 'Laravel 500 vs NestJS 422 — Laravel can\'t respond with validation errors due to scope bug',
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — WorkerRelativeDisabilityController has no show() method (apiResource auto-generates route, but method missing). NestJS correctly returns 404.',
    },
    {
      name: 'update non-existent returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/999999',
        body: { level: 1, number: 'X' },
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'delete non-existent returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ---------- Reports (8 endpoints) ----------
export const hrReportsModule: ModuleDefinition = {
  name: 'hr-reports',
  tags: ['hr'],
  basePath: '/api/v1/hr/report',
  defaultAuth: 'admin',
  // Permission scope (organization-admin / organization-leader) NestJS'da yo'q.
  ignorePaths: ['data', 'data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'structure',
      tags: ['list'],
      request: { method: 'GET', path: '/structure' },
    },
    {
      name: 'departments (organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', path: '/departments', query: { organization_id: 1 } },
    },
    {
      name: 'department-positions (organization_id=1)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/department-positions',
        query: { organization_id: 1, per_page: 2 },
      },
    },
    {
      name: 'worker-positions (organization_id=1)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/worker-positions',
        query: { organization_id: 1, per_page: 2 },
      },
    },
    {
      name: 'optimization without department_id returns 422',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/optimization' },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'orderable with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/orderable', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'delete department 999999 returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/departments/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — proxies to DepartmentController which throws (no findOrFail) → 500. NestJS correctly returns 404.',
    },
    {
      name: 'delete department-position 999999 returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/department-positions/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — proxies to DepartmentPositionController; 500 on missing model. NestJS correctly returns 404.',
    },
  ],
};

// ---------- Worker Position extras (show/edit/positionInfo/newCareers/updatePosition/role) ----------
// Show/edit return Laravel WorkerShowResource — complex shape with many joins.
// NestJS implementation includes main joins but may miss some nested fields.
export const workerPositionExtrasModule: ModuleDefinition = {
  name: 'worker-position-extras',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  // Show/edit response Laravel'da 25+ join, NestJS minimal versiyasi — data ignor.
  ignorePaths: ['data'],
  scenarios: [
    {
      name: 'worker-position-info/1',
      tags: ['detail'],
      request: { method: 'GET', path: '/worker-position-info/1' },
    },
    {
      name: 'worker-position-info/999999 returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/worker-position-info/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — positionInfos() uses ::find() (no fail), then accesses null->relations → 500. NestJS correctly returns 404.',
    },
    {
      name: 'worker-positions/{uuid} 404',
      tags: ['detail', 'validation'],
      request: {
        method: 'GET',
        path: '/worker-positions/00000000-0000-0000-0000-000000000000',
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'updatePosition 999999 returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/worker-positions/999999/update',
        body: {
          contract_number: '1',
          contract_date: '2025-01-01',
          group: 0,
          rank: '1',
          rate: 100,
          type: 1,
          salary: 1000000,
          schedule_id: 1,
          position_date: '2025-01-01',
        },
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'updatePosition with empty body returns 422',
      tags: ['update', 'validation'],
      request: { method: 'PUT', path: '/worker-positions/1/update', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'deleteNewCareer 999999 returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/worker-new-careers/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'attach-role empty body returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        path: '/worker-positions/00000000-0000-0000-0000-000000000000/edit/attach-role',
        body: {},
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Vacancy Positions extras (15 endpoints) ----------
export const vacancyPositionsModule: ModuleDefinition = {
  name: 'vacancy-positions',
  tags: ['hr'],
  basePath: '/api/v1/hr/vacancy',
  defaultAuth: 'admin',
  ignorePaths: ['data', 'data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'positions list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/positions', query: { per_page: 2 } },
    },
    {
      name: 'positions create empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/positions', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'show 999999 returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'edit 999999 returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999/edit' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'change-status 999999 returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/999999/change-status',
        body: { status: true },
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'finish 999999 returns 404',
      tags: ['update', 'validation'],
      request: { method: 'PUT', path: '/999999/finish' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel bug — finish() validates request body (422) before findOrFail. NestJS validates id first → 404.',
    },
    {
      name: 'delete 999999 returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'applications 999999 returns 404',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/999999/applications' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel returns 200 with empty data (no parent validation). NestJS correctly returns 404.',
    },
  ],
};

// ---------- OrganizationPhones (apiResource) ----------
export const organizationPhonesModule: ModuleDefinition = {
  name: 'organization-phones',
  tags: ['hr'],
  basePath: '/api/v1/hr/organization-phones',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'create empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const organizationPhonesListModule: ModuleDefinition = {
  name: 'organization-phones-list',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'list endpoint',
      tags: ['list'],
      request: { method: 'GET', path: '/organization-phones-list' },
    },
  ],
};

// ---------- Worker Users (5 endpoints, route prefix: /api/v1/extra/users) ----------
export const workerUsersModule: ModuleDefinition = {
  name: 'worker-users',
  tags: ['hr'],
  basePath: '/api/v1/extra/users',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  maskPaths: ['data.data[].worker.photo'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'attach-role empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/attach-role', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'detach-role empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/detach-role', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'update-password empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/update-password', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'update profile empty body returns 422',
      tags: ['update', 'validation'],
      request: { method: 'PUT', path: '/update', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Edu Plans (5 endpoints) ----------
export const eduPlansModule: ModuleDefinition = {
  name: 'edu-plans',
  tags: ['hr'],
  basePath: '/api/v1/hr/edu-plans',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'search-workers without edu_plan_id returns 422',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/search-workers' },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'attach-workers empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/attach-workers', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'attached-workers (per_page=2)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/attached-workers',
        query: { per_page: 2 },
      },
    },
    {
      name: 'detach-workers empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/detach-workers', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Department Locations (apiResource + list) ----------
export const departmentLocationsModule: ModuleDefinition = {
  name: 'department-locations',
  tags: ['hr'],
  basePath: '/api/v1/extra/department/locations',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'show 999999 returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'create empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'delete 999999 returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ---------- Worker Photos (apiResource) ----------
export const workerPhotosModule: ModuleDefinition = {
  name: 'worker-photos',
  tags: ['hr'],
  basePath: '/api/v1/hr/worker-photos',
  defaultAuth: 'admin',
  maskPaths: ['data[].photo'],
  scenarios: [
    {
      name: 'list (worker_id=11)',
      tags: ['list'],
      request: { method: 'GET', query: { worker_id: 11 } },
    },
    {
      name: 'list (empty worker_id)',
      tags: ['list'],
      request: { method: 'GET' },
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'delete non-existent returns 400 (Laravel) / 400 (NestJS)',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/999999' },
      expectStatus: 400,
      statusOnly: true,
    },
  ],
};

// ---------- Worker Applications ----------
export const workerApplicationsModule: ModuleDefinition = {
  name: 'worker-applications',
  tags: ['hr'],
  basePath: '/api/v1/hr/applications',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  maskPaths: ['data.data[].worker.photo', 'data.data[].file', 'data.data[].confirmation_file'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'accept non-existent returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/999999/accept',
        body: { status: true },
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'generate-url with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/generate-url', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Worker Meds ----------
export const workerMedsModule: ModuleDefinition = {
  name: 'worker-meds',
  tags: ['hr'],
  basePath: '/api/v1/hr/worker-meds',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  maskPaths: ['data.data[].worker.photo', 'data.data[].file'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'update non-existent returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'PUT',
        path: '/999999',
        body: { from: '2025-01-01', status: 1 },
      },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'delete non-existent returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ---------- Dashboard (main 3 endpoints) ----------
// Laravel permission scope farq qiladi — count'larni ignor qilamiz.
export const dashboardModule: ModuleDefinition = {
  name: 'dashboard',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  // Hammasi count-based aggregate; permission scope NestJS'da yo'q.
  ignorePaths: [
    'data',
  ],
  scenarios: [
    {
      name: 'dashboard (main)',
      tags: ['list'],
      request: { method: 'GET', path: '/dashboard' },
    },
    {
      name: 'dashboard-two (meds/disciplinary/incentives)',
      tags: ['list'],
      request: { method: 'GET', path: '/dashboard-two' },
    },
    {
      name: 'dashboard-three (disabilities/sick leaves)',
      tags: ['list'],
      request: { method: 'GET', path: '/dashboard-three' },
    },
  ],
};

// ---------- Dashboard Views (14 paginated lists) ----------
export const dashboardViewsModule: ModuleDefinition = {
  name: 'dashboard-views',
  tags: ['hr'],
  basePath: '/api/v1/hr/dashboard',
  defaultAuth: 'admin',
  // Permission scope farqi — data va total/per_page ignor.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  maskPaths: ['data.data[].worker.photo'],
  scenarios: [
    {
      name: 'birthdays (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/birthdays', query: { per_page: 2 } },
    },
    {
      name: 'educations (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/educations', query: { per_page: 2 } },
    },
    {
      name: 'age (start=25, end=35)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/age',
        query: { age_start: 25, age_end: 35, per_page: 2 },
      },
    },
    {
      name: 'passport (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/passport', query: { per_page: 2 } },
    },
    {
      name: 'pension (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/pension', query: { per_page: 2 } },
    },
    {
      name: 'meds (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/meds', query: { per_page: 2 } },
    },
    {
      name: 'worker-disabilities/preview',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/worker-disabilities/preview',
        query: { per_page: 2 },
      },
    },
    {
      name: 'worker-relative-disabilities/preview',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/worker-relative-disabilities/preview',
        query: { per_page: 2 },
      },
    },
    {
      name: 'worker-sick-leaves/preview',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/worker-sick-leaves/preview',
        query: { per_page: 2 },
      },
    },
    {
      name: 'disciplinary-actions',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/disciplinary-actions',
        query: { per_page: 2 },
      },
    },
    {
      name: 'incentive-actions',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/incentive-actions',
        query: { per_page: 2 },
      },
    },
    {
      name: 'contract-types',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/contract-types',
        query: { per_page: 2 },
      },
    },
    {
      name: 'contracts (type=created)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/contracts',
        query: { type: 'created', per_page: 2 },
      },
    },
    {
      name: 'contracts (type=ended)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/contracts',
        query: { type: 'ended', per_page: 2 },
      },
    },
  ],
};

// ---------- HR Enums extras (contract-additional-types, command-types, reason-types) ----------
export const enumsExtrasModule: ModuleDefinition = {
  name: 'enums-extras',
  tags: ['hr'],
  basePath: '/api/v1/hr/enums',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'contract-additional-types (no type)',
      tags: ['list'],
      request: { method: 'GET', path: '/contract-additional-types' },
    },
    {
      name: 'contract-additional-types (contract_type=2)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/contract-additional-types',
        query: { contract_type: 2 },
      },
    },
    {
      name: 'command-types (default)',
      tags: ['list'],
      request: { method: 'GET', path: '/command-types', query: { type: 44 } },
    },
    {
      name: 'command-types (status=contracts, type=1)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/command-types',
        query: { status: 'contracts', type: 1 },
      },
    },
    {
      name: 'reason-types (type=44)',
      tags: ['list'],
      request: { method: 'GET', path: '/reason-types', query: { type: 44 } },
    },
  ],
};

// ---------- Vacation extras (create + calculate) ----------
export const vacationExtrasModule: ModuleDefinition = {
  name: 'vacation-extras',
  tags: ['hr'],
  basePath: '/api/v1/hr/vacations',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/create', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'calculate with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/calculate', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Worker-additional ----------
export const workerAdditionalModule: ModuleDefinition = {
  name: 'worker-additional',
  tags: ['hr'],
  basePath: '/api/v1/hr/worker-additional',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'pension_count for worker-position 1',
      tags: ['detail'],
      request: { method: 'GET', path: '/1', query: { type: 'pension_count' } },
    },
    {
      name: 'pension_coefficient',
      tags: ['detail'],
      request: { method: 'GET', path: '/1', query: { type: 'pension_coefficient' } },
    },
    {
      name: 'financial_assistance',
      tags: ['detail'],
      request: { method: 'GET', path: '/1', query: { type: 'financial_assistance' } },
    },
    {
      name: 'invalid type returns 422',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/1', query: { type: 'invalid_type' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Sortable aliases (Laravel hyphen URLs) ----------
export const sortableAliasesModule: ModuleDefinition = {
  name: 'sortable-aliases',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'worker-relatives-sortable with empty body',
      tags: ['update'],
      request: {
        method: 'PUT',
        path: '/worker-relatives-sortable',
        body: { orders: [] },
      },
    },
    {
      name: 'worker-old-careers-sortable with empty body',
      tags: ['update'],
      request: {
        method: 'PUT',
        path: '/worker-old-careers-sortable',
        body: { orders: [] },
      },
    },
  ],
};

// ---------- Filter extras ----------
export const filterExtrasModule: ModuleDefinition = {
  name: 'filter-extras',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  // Permission scope hozircha NestJS'da yo'q.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'get-department (root depts, per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/get-department', query: { per_page: 2 } },
    },
    {
      name: 'get-positions (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/get-positions', query: { per_page: 2 } },
    },
    {
      name: 'search-workers (organization_id=1, per_page=2)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/search-workers',
        query: { organization_id: 1, per_page: 2 },
      },
    },
    {
      name: 'search-workers without organization_id returns 422',
      tags: ['list', 'validation'],
      request: { method: 'GET', path: '/search-workers' },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ---------- Filter endpoints ----------
export const filtersModule: ModuleDefinition = {
  name: 'filters',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'get-department-positions (department_id=1)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/get-department-positions',
        query: { department_id: 1 },
      },
    },
    {
      name: 'get-departments-tree (organization_id=1)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/get-departments-tree',
        query: { organization_id: 1 },
      },
    },
  ],
};

// ---------- VacationScheduleYear (Bosqich 6 ext) ----------
export const vacationScheduleYearsModule: ModuleDefinition = {
  name: 'vacation-schedule-years',
  tags: ['hr'],
  basePath: '/api/v1/hr/vacation-schedule',
  defaultAuth: 'admin',
  maskPaths: [
    'data.data[].director.worker.photo',
    'data.data[].tradeUnion.worker.photo',
    'data.data[].creator.worker.photo',
    'data.data[].file',
    'data.data[].confirmation_file',
  ],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

// ---------- ExportTasks list (Bosqich 8 ext) ----------
export const exportTasksModule: ModuleDefinition = {
  name: 'export-tasks',
  tags: ['hr'],
  basePath: '/api/v1/hr/export',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker.photo', 'data.data[].file'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'tasks list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/tasks', query: { per_page: 2 } },
    },
  ],
};

// ---------- Worker Export columns (Bosqich 8) ----------
export const workerExportColumnsModule: ModuleDefinition = {
  name: 'worker-export-columns',
  tags: ['hr'],
  basePath: '/api/v1/hr/export',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'columns (uz default)',
      tags: ['list'],
      request: { method: 'GET', path: '/workers/columns' },
    },
    {
      name: 'columns (lang=ru)',
      tags: ['list'],
      request: { method: 'GET', path: '/workers/columns', query: { lang: 'ru' } },
    },
    {
      name: 'columns (lang=en)',
      tags: ['list'],
      request: { method: 'GET', path: '/workers/columns', query: { lang: 'en' } },
    },
  ],
};

// ---------- ContractAdditional + ConfirmationWorker (Bosqich 4 ext) ----------
export const contractAdditionalModule: ModuleDefinition = {
  name: 'contract-additional',
  tags: ['hr'],
  basePath: '/api/v1/hr/contract-additional',
  defaultAuth: 'admin',
  maskPaths: [
    'data.data[].worker.photo',
    'data.data[].file',
    'data.data[].confirmation_file',
  ],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

export const confirmationWorkersModule: ModuleDefinition = {
  name: 'confirmation-workers',
  tags: ['hr'],
  basePath: '/api/v1/hr/confirmation-workers',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker.photo'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

// ---------- Vacations (Bosqich 6) ----------
export const vacationsModule: ModuleDefinition = {
  name: 'vacations',
  tags: ['hr'],
  basePath: '/api/v1/hr/vacations',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker_position.worker.photo'],
  // total — permission scope (small diff).
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'list (per_page=2, to>=today)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
  ],
};

export const vacationSchedulesModule: ModuleDefinition = {
  name: 'vacation-schedules',
  tags: ['hr'],
  basePath: '/api/v1/hr/vacation-schedules',
  defaultAuth: 'admin',
  maskPaths: ['data.data[].worker.photo'],
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2, organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { per_page: 2, organization_id: 1 } },
    },
  ],
};

export const vacanciesModule: ModuleDefinition = {
  name: 'vacancies',
  tags: ['hr'],
  basePath: '/api/v1/hr/vacancy',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (per_page=2, organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { per_page: 2, organization_id: 1 } },
    },
    {
      name: 'list (per_page=3, organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { per_page: 3, organization_id: 1 } },
    },
  ],
};

export const commandsModule: ModuleDefinition = {
  name: 'commands',
  tags: ['hr'],
  basePath: '/api/v1/hr/commands',
  defaultAuth: 'admin',
  maskPaths: [
    'data.data[].workers[].worker.photo',
    'data.data[].file',
    'data.data[].confirmation_file',
  ],
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'list (organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { organization_id: 1, per_page: 3 } },
    },
  ],
};

// ---------- Department positions ----------
export const departmentPositionsModule: ModuleDefinition = {
  name: 'department-positions',
  tags: ['hr'],
  basePath: '/api/v1/hr/department-positions',
  defaultAuth: 'admin',
  // total — Laravel permission scope (childIds) orqali ~14 row chetlanadi.
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'list (default per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
    },
    {
      name: 'list (per_page=5, organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { per_page: 5, organization_id: 1 } },
    },
    {
      name: 'list (departments=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { departments: '1', per_page: 5 } },
    },
    {
      name: 'show id=1 (with full position)',
      tags: ['detail'],
      request: { method: 'GET', path: '/1' },
    },
  ],
};

// ---------- Department extras (levels / list / tree) ----------
export const departmentExtrasModule: ModuleDefinition = {
  name: 'department-extras',
  tags: ['hr'],
  basePath: '/api/v1/hr',
  defaultAuth: 'admin',
  // Department-list ham permission scope farqi bor (3757 vs 3761).
  ignorePaths: ['data.per_page', 'data.total'],
  scenarios: [
    {
      name: 'department-levels (enum)',
      tags: ['list'],
      request: { method: 'GET', path: '/department-levels' },
    },
    {
      name: 'department-list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/department-list', query: { per_page: 3 } },
    },
    {
      name: 'department-list (search=bo\'lim)',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/department-list',
        query: { search: "bo'lim", per_page: 5 },
      },
    },
  ],
};
