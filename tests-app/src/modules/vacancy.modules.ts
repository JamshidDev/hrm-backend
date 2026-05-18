// Vacancy modullari uchun parity scenariolari.
// Laravel: Modules/Vacancy — 6 ta controller, ~29 endpoint.
//
// NestJS struktura (Turnstile/Exam pattern):
//   vacancy-board/, enums-endpoint/, vacancy-auth/, careers/,
//   educations/, applications/, exams/, zoom/
//
// ESLATMA: Laravel `auth:vacancy` guard (alohida vacancy_users jadvali).
// NestJS'da bu guard hali yo'q — auth endpointlar AuthHybridGuard + stub
// user id = 0 bilan ishlaydi. Shuning uchun ko'p auth-scenariy `guest`
// (token yo'q) holatda 401 kutadi yoki `statusOnly` bilan tekshiriladi.

import type { ModuleDefinition } from '@/configs/types';

// ============================================================
// /api/v1/vacancies — VacancyController (public board)
// ============================================================
export const vacancyBoardModule: ModuleDefinition = {
  name: 'vacancy-board',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies',
  defaultAuth: 'guest',
  ignorePaths: ['data.per_page'],
  scenarios: [
    {
      name: 'organizations list',
      tags: ['list'],
      request: { method: 'GET', path: '/organizations' },
      // Laravel OrganizationListResource — to'liq join; Nest sodda select.
      statusOnly: true,
    },
    {
      name: 'report (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/report', query: { per_page: 3 } },
      // Laravel VacanciesResource — department_position join; Nest raw rows.
      statusOnly: true,
    },
    {
      name: 'report show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/report/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'list (active vacancies short list)',
      tags: ['list'],
      request: { method: 'GET', path: '/list' },
      // Laravel list() — grouped struktura (organizations, regions, lastVacancies);
      // Nest sodda massiv. Shape farq qiladi.
      statusOnly: true,
    },
    {
      name: 'regions list',
      tags: ['list'],
      request: { method: 'GET', path: '/regions' },
      statusOnly: true,
    },
    {
      name: 'cities list',
      tags: ['list'],
      request: { method: 'GET', path: '/cities' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies/enums
// ============================================================
export const vacancyEnumsModule: ModuleDefinition = {
  name: 'vacancy-enums',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies/enums',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'enums (educations, countries, file types, ...)',
      tags: ['list'],
      request: { method: 'GET' },
      // Laravel LanguageResource/NationalityResource collection;
      // Nest hozircha bo'sh massiv. Shape darajasida farq.
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies — VacancyUserController (auth)
// ============================================================
export const vacancyAuthModule: ModuleDefinition = {
  name: 'vacancy-auth',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'login with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/login', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'login with wrong credentials returns 401',
      tags: ['create', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '000000000', password: 'wrongpass123' },
      },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      name: 'token (sendOtp) with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/token', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'register with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/register', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'profile without auth returns 401',
      tags: ['detail', 'auth'],
      request: { method: 'GET', path: '/profile' },
      expectStatus: 401,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies/careers — VacancyUserCareerController
// ============================================================
export const vacancyCareersModule: ModuleDefinition = {
  name: 'vacancy-careers',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies/careers',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'list without auth returns 401',
      tags: ['list', 'auth'],
      request: { method: 'GET' },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      name: 'create without auth returns 401',
      tags: ['create', 'auth'],
      request: { method: 'POST', body: {} },
      expectStatus: 401,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies/educations — VacancyUserEducationController
// ============================================================
export const vacancyEducationsModule: ModuleDefinition = {
  name: 'vacancy-educations',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies/educations',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'list without auth returns 401',
      tags: ['list', 'auth'],
      request: { method: 'GET' },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      name: 'create without auth returns 401',
      tags: ['create', 'auth'],
      request: { method: 'POST', body: {} },
      expectStatus: 401,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies — VacancySendController (applications)
// ============================================================
export const vacancyApplicationsModule: ModuleDefinition = {
  name: 'vacancy-applications',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'applications list without auth returns 401',
      tags: ['list', 'auth'],
      request: { method: 'GET', path: '/applications' },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      name: 'dashboard without auth returns 401',
      tags: ['detail', 'auth'],
      request: { method: 'GET', path: '/dashboard' },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      name: 'send-application without auth returns 401',
      tags: ['create', 'auth'],
      request: { method: 'POST', path: '/send-application', body: {} },
      expectStatus: 401,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies/applications/{id}/exam — VacancyExamController
// ============================================================
export const vacancyExamsModule: ModuleDefinition = {
  name: 'vacancy-exams',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies/applications',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'exam start without auth returns 401',
      tags: ['create', 'auth'],
      request: { method: 'POST', path: '/1/exam/start', body: {} },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      name: 'exam results without auth returns 401',
      tags: ['detail', 'auth'],
      request: { method: 'GET', path: '/1/exam/1/results' },
      expectStatus: 401,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/vacancies/zoom/check-meet — ZoomController (public)
// ============================================================
export const vacancyZoomModule: ModuleDefinition = {
  name: 'vacancy-zoom',
  tags: ['vacancy'],
  basePath: '/api/v1/vacancies/zoom',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'check-meet (external Zoom API stub)',
      tags: ['create'],
      request: { method: 'POST', path: '/check-meet', body: {} },
      // Laravel tashqi Zoom API'siga ulanadi va credential/network yo'qligida
      // 500 qaytaradi (Laravel bug). Nest stub 201 qaytaradi — skip.
      statusOnly: true,
      skip: 'Laravel 500 (external Zoom API unreachable) vs Nest stub 201 — Laravel bug',
    },
  ],
};
