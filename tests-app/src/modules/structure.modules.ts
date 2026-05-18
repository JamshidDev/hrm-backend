// Structure modullari: countries, regions, cities, languages.
// Laravel: Modules/Structure/routes/api.php.

import type { ModuleDefinition } from '@/configs/types';

export const countriesModule: ModuleDefinition = {
  name: 'countries',
  tags: ['structure'],
  basePath: '/api/v1/structure/countries',
  defaultAuth: 'admin',
  // NestJS qo'shimcha key — Laravel'da yo'q.
  ignorePaths: ['data.per_page'],
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
      name: 'list (search="Uzbekistan")',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'Uzbekistan' } },
    },
    {
      name: 'list (search noresult)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'NoSuchCountryXYZ' } },
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

export const regionsModule: ModuleDefinition = {
  name: 'regions',
  tags: ['structure'],
  basePath: '/api/v1/structure/regions',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default pagination)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
    },
    {
      name: 'list (per_page=5)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (country_id=1 filter)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { country_id: 1, per_page: 3 } },
    },
    {
      // NestJS @Exists 422 qaytaradi (to'g'ri behavior).
      // Laravel `exists:` rule yo'q → DB FK xatosi → 500. Bu Laravel bug'i.
      name: 'create with invalid country_id',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { country_id: 99999, name: 'X' } },
      expectStatus: 422,
      statusOnly: true,
      skip: 'Laravel 500 vs NestJS 422 — Laravel bug (no `exists:` rule)',
    },
    {
      name: 'create with empty name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { country_id: 1, name: '' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const citiesModule: ModuleDefinition = {
  name: 'cities',
  tags: ['structure'],
  basePath: '/api/v1/structure/cities',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
    },
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (region_id=1 filter)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { region_id: 1, per_page: 3 } },
    },
    {
      name: 'create with invalid region_id',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { region_id: 99999, name: 'X' } },
      expectStatus: 422,
      statusOnly: true,
      skip: 'Laravel 500 vs NestJS 422 — Laravel bug (no `exists:` rule)',
    },
  ],
};

export const languagesModule: ModuleDefinition = {
  name: 'languages',
  tags: ['structure'],
  basePath: '/api/v1/structure/languages',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
    },
    {
      name: 'list (per_page=2)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 2 } },
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

export const positionsModule: ModuleDefinition = {
  name: 'positions',
  tags: ['structure'],
  basePath: '/api/v1/structure/positions',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (search="Direktor")',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'Direktor', per_page: 5 } },
    },
    {
      name: 'list (ids=1,2,3)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { ids: '1,2,3' } },
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

export const specialitiesModule: ModuleDefinition = {
  name: 'specialities',
  tags: ['structure'],
  basePath: '/api/v1/structure/specialities',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (per_page=10)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 10 } },
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

export const universitiesModule: ModuleDefinition = {
  name: 'universities',
  tags: ['structure'],
  basePath: '/api/v1/structure/universities',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (per_page=5)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'create with empty name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: '', city_id: 1, education: 1, type: 1 } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with invalid city_id returns 422 (@Exists)',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        body: { name: 'Test', city_id: 99999, education: 1, type: 1 },
      },
      expectStatus: 422,
      statusOnly: true,
      skip: 'Laravel: city_id `exists:cities,id` rule bor lekin parity 422 — NestJS @Exists ham 422',
    },
  ],
};

export const organizationsModule: ModuleDefinition = {
  name: 'organizations',
  tags: ['structure'],
  basePath: '/api/v1/structure/organizations',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (root only, per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (search="temir")',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'temir', per_page: 3 } },
    },
    {
      name: 'create with empty name returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        body: { name: '', full_name: '', level: 1, code: '', city_id: 1 },
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const schedulesModule: ModuleDefinition = {
  name: 'schedules',
  tags: ['structure'],
  basePath: '/api/v1/structure/schedules',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (per_page=10)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 10 } },
    },
    {
      name: 'create with missing name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { type: 1 } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with missing type returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: 'Test' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const workDaysModule: ModuleDefinition = {
  name: 'work-days',
  tags: ['structure'],
  basePath: '/api/v1/structure/work-days',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (schedule_id=1 filter)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { schedule_id: 1, per_page: 5 } },
    },
    {
      name: 'create with invalid time format returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        body: { schedule_id: 1, start_time: 'invalid', end_time: '18:00', day_of_week: 1, type: 1 },
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with invalid day_of_week returns 422',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        body: { schedule_id: 1, start_time: '09:00', end_time: '18:00', day_of_week: 99, type: 1 },
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with invalid schedule_id (NestJS=422 vs Laravel=422 — exists rule mavjud)',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        body: { schedule_id: 99999, start_time: '09:00', end_time: '18:00', day_of_week: 1, type: 1 },
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const holidaysModule: ModuleDefinition = {
  name: 'holidays',
  tags: ['structure'],
  basePath: '/api/v1/structure/holidays',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      // Default: current month filter (Laravel whereMonth(holiday_date, date('m'))).
      name: 'list (current month default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (month=1 — January)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { month: 1, per_page: 10 } },
    },
    {
      name: 'list (month=9 — September)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { month: 9, per_page: 10 } },
    },
    {
      name: 'create with empty name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { holiday_date: '2026-01-01', type: 1 } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with invalid date',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: 'Test', holiday_date: 'invalid', type: 1 } },
      expectStatus: 422,
      statusOnly: true,
      skip: 'Laravel 500 vs NestJS 422 — Laravel bug (no `date` rule, DB rejects)',
    },
  ],
};

export const quotesModule: ModuleDefinition = {
  name: 'quotes',
  tags: ['structure'],
  basePath: '/api/v1/structure/quotes',
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
      name: 'create with missing text returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { author: { uz: 'A', ru: 'A', en: 'A' } } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with missing author returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { text: { uz: 'T', ru: 'T', en: 'T' } } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// Random quote endpoint — alohida path: /api/v1/quote.
export const quoteRandomModule: ModuleDefinition = {
  name: 'quote-random',
  tags: ['structure'],
  basePath: '/api/v1/quote',
  defaultAuth: 'admin',
  scenarios: [
    {
      // Random quote har request'da o'zgaradi — body solishtirib bo'lmaydi.
      // Faqat status code va shape tekshiramiz (statusOnly: true).
      name: 'random quote returns 200',
      tags: ['detail'],
      request: { method: 'GET' },
      statusOnly: true,
    },
  ],
};

export const reportsModule: ModuleDefinition = {
  name: 'reports',
  tags: ['structure'],
  basePath: '/api/v1/structure',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  // MinIO signed URLs har request'da o'zgaradi.
  maskPaths: ['data.data[].file', 'data.data[].confirmation_file'],
  scenarios: [
    {
      name: 'reports list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/reports', query: { per_page: 3 } },
    },
    {
      name: 'reports list (year=2026)',
      tags: ['list', 'filter'],
      request: { method: 'GET', path: '/reports', query: { year: 2026, per_page: 5 } },
    },
    {
      name: 'reports-per-month list',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/reports-per-month', query: { per_page: 5 } },
    },
  ],
};

export const exportModule: ModuleDefinition = {
  name: 'export',
  tags: ['structure'],
  basePath: '/api/v1/structure',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'tasks-count (unread)',
      tags: ['list'],
      request: { method: 'GET', path: '/export/tasks-count' },
    },
    {
      name: 'report-export list',
      tags: ['list'],
      request: { method: 'GET', path: '/report-export' },
    },
  ],
};

export const structureTreeModule: ModuleDefinition = {
  name: 'structure-tree',
  tags: ['structure'],
  basePath: '/api/v1/structure',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'all (full tree)',
      tags: ['list'],
      request: { method: 'GET', path: '/all' },
    },
    {
      name: 'parents (ancestors chain)',
      tags: ['list'],
      request: { method: 'GET', path: '/parents' },
    },
  ],
};

export const vacancyApproveModule: ModuleDefinition = {
  name: 'vacancy-approve',
  tags: ['structure'],
  basePath: '/api/v1/structure/vacancy-approve',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'list organizations (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/organizations', query: { per_page: 5 } },
    },
    {
      name: 'list organizations (per_page=10)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/organizations', query: { per_page: 10 } },
    },
    {
      name: 'attach with empty to_organization_ids returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/attach', body: { from_organization_id: 1, to_organization_ids: [] } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const contractTypesModule: ModuleDefinition = {
  name: 'contract-types',
  tags: ['structure'],
  basePath: '/api/v1/structure/contract-types',
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
      name: 'list (organization_id=1)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { organization_id: 1, per_page: 5 } },
    },
  ],
};

export const contractAdditionalTypesModule: ModuleDefinition = {
  name: 'contract-additional-types',
  tags: ['structure'],
  basePath: '/api/v1/structure/contract-additional-types',
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
  ],
};

export const commandTypesModule: ModuleDefinition = {
  name: 'command-types',
  tags: ['structure'],
  basePath: '/api/v1/structure/command-types',
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
  ],
};

export const learningCentersModule: ModuleDefinition = {
  name: 'learning-centers',
  tags: ['structure'],
  basePath: '/api/v1/structure/learning-centers',
  defaultAuth: 'admin',
  ignorePaths: ['data.per_page'],
  // MinIO photo URL signature har request'da o'zgaradi.
  maskPaths: ['data.data[].users[].worker.photo'],
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'list (per_page=5)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 5 } },
    },
    {
      name: 'list (search)',
      tags: ['list', 'filter'],
      request: { method: 'GET', query: { search: 'markaz', per_page: 5 } },
    },
    {
      name: 'create with missing name returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { code: 'TEST' } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with missing code returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: 'Test' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const enumsModule: ModuleDefinition = {
  name: 'enums',
  tags: ['structure'],
  basePath: '/api/v1/structure/enums',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'list all enums (all 10 collections)',
      tags: ['list'],
      request: { method: 'GET' },
    },
  ],
};

export const organizationServicesModule: ModuleDefinition = {
  name: 'organization-services',
  tags: ['structure'],
  basePath: '/api/v1/structure/organization-services',
  defaultAuth: 'admin',
  scenarios: [
    {
      // Laravel bug: Helper::organizationServices uses `$status?->active === 1`
      // (strict ===), lekin DB'da boolean true. PHP'da `true === 1` → false.
      // Laravel har doim active:false qaytaradi, NestJS to'g'ri active:true.
      name: 'list for organization_id=1',
      tags: ['list'],
      request: { method: 'GET', query: { organization_id: 1 } },
      skip: 'Laravel bug: `active === 1` strict comparison fails for boolean true',
    },
    {
      name: 'list for organization_id=2 (no services)',
      tags: ['list'],
      request: { method: 'GET', query: { organization_id: 2 } },
    },
    {
      name: 'create with missing organization_id returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { key: 'e-signature', active: true } },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'create with missing key returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { organization_id: 1, active: true } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// Qo'shimcha endpointlar — Laravel: organization-list, organization-levels.
export const organizationExtraModule: ModuleDefinition = {
  name: 'organization-extra',
  tags: ['structure'],
  basePath: '/api/v1/structure',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'organization-levels',
      tags: ['list'],
      request: { method: 'GET', path: '/organization-levels' },
    },
    {
      name: 'organization-list (search="temir")',
      tags: ['list', 'filter'],
      request: {
        method: 'GET',
        path: '/organization-list',
        query: { search: 'temir' },
      },
    },
  ],
};
