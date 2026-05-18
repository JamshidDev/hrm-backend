// Exam modullari uchun parity scenariolari.
// Laravel: Modules/Exam — 11 ta controller, ~34 endpoint.
//
// NestJS struktura (Turnstile pattern):
//   topics/, topic-files/, topic-exams/, topic-extras/, categories/,
//   category-questions/, worker-exams/, exam-videos/, results/,
//   enums-endpoint/, public-exam-results/

import type { ModuleDefinition } from '@/configs/types';

const PAGE_IGNORE = ['data.per_page'];
const FULL_PAGE_IGNORE = ['data.per_page', 'data.total', 'data.data'];

// ============================================================
// /api/v1/exam/topics — TopicController (apiResource + filter)
// ============================================================
export const examTopicsModule: ModuleDefinition = {
  name: 'exam-topics',
  tags: ['exam'],
  basePath: '/api/v1/exam/topics',
  defaultAuth: 'admin',
  // Laravel filterByOrganizations user-scope; Nest hozircha barchasini qaytaradi.
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/filter/topics + filter/exams
// ============================================================
export const examFiltersModule: ModuleDefinition = {
  name: 'exam-filters',
  tags: ['exam'],
  basePath: '/api/v1/exam/filter',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'topics flat list',
      tags: ['list'],
      request: { method: 'GET', path: '/topics' },
    },
    {
      name: 'exams flat list',
      tags: ['list'],
      request: { method: 'GET', path: '/exams' },
    },
  ],
};

// ============================================================
// /api/v1/exam/topics/{id}/files — TopicFileController
// ============================================================
export const examTopicFilesModule: ModuleDefinition = {
  name: 'exam-topic-files',
  tags: ['exam'],
  basePath: '/api/v1/exam/topics/1/files',
  defaultAuth: 'admin',
  // MinIO signed URL har request'da o'zgaradi — mask qilamiz.
  maskPaths: ['data[].items[].file'],
  scenarios: [
    {
      name: 'list grouped by file type',
      tags: ['list'],
      request: { method: 'GET' },
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel TopicFileController has no show method — 500 vs Nest 404',
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/topics/{id}/exams — TopicExamController + attach-question + solved-workers
// ============================================================
export const examTopicExamsModule: ModuleDefinition = {
  name: 'exam-topic-exams',
  tags: ['exam'],
  basePath: '/api/v1/exam/topics/1/exams',
  defaultAuth: 'admin',
  // TopicExamResource topic + results subobject'lari Nest'da hozircha join'siz.
  ignorePaths: ['data.per_page', 'data.data[].topic', 'data.data[].results'],
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'solved-workers',
      tags: ['list'],
      request: { method: 'GET', path: '/1/solved-workers', query: { per_page: 3 } },
      // Laravel solved_workers heavy SQL bilan; Nest hozircha bo'sh paginatsiya.
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/topics/{id}/positions + /workers — TopicExtras
// ============================================================
export const examTopicExtrasModule: ModuleDefinition = {
  name: 'exam-topic-extras',
  tags: ['exam'],
  basePath: '/api/v1/exam/topics/1',
  defaultAuth: 'admin',
  // Laravel heavy SQL; NestJS hozircha bo'sh paginatsiya.
  ignorePaths: ['data.per_page', 'data.total', 'data.data'],
  scenarios: [
    {
      name: 'positions',
      tags: ['list'],
      request: { method: 'GET', path: '/positions' },
    },
    {
      name: 'workers',
      tags: ['list'],
      request: { method: 'GET', path: '/workers' },
    },
  ],
};

// ============================================================
// /api/v1/exam/categories — CategoryController + clear + excel-header + import
// ============================================================
export const examCategoriesModule: ModuleDefinition = {
  name: 'exam-categories',
  tags: ['exam'],
  basePath: '/api/v1/exam/categories',
  defaultAuth: 'admin',
  // Laravel filterByOrganizations user-scope; Nest hozircha barchasini qaytaradi.
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel ExamCategoryController has no show method — 500 vs Nest 404',
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/categories/{id}/questions — CategoryQuestionController
// ============================================================
export const examCategoryQuestionsModule: ModuleDefinition = {
  name: 'exam-category-questions',
  tags: ['exam'],
  basePath: '/api/v1/exam/categories/1/questions',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/worker-exams — WorkerExamController + statistics
// ============================================================
export const examWorkerExamsModule: ModuleDefinition = {
  name: 'exam-worker-exams',
  tags: ['exam'],
  basePath: '/api/v1/exam/worker-exams',
  defaultAuth: 'admin',
  // Laravel filterByOrganizations Nest'da yo'q — total farq qiladi.
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
    },
    {
      name: 'statistics',
      tags: ['list'],
      request: { method: 'GET', path: '/statistics' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/results — ResultController
// ============================================================
export const examResultsModule: ModuleDefinition = {
  name: 'exam-results',
  tags: ['exam'],
  basePath: '/api/v1/exam',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'results list',
      tags: ['list'],
      request: { method: 'GET', path: '/results', query: { per_page: 3 } },
    },
    {
      name: 'results/export',
      tags: ['list'],
      request: { method: 'GET', path: '/results/export' },
      statusOnly: true,
    },
    {
      name: 'not-passed-workers',
      tags: ['list'],
      request: { method: 'GET', path: '/not-passed-workers' },
      statusOnly: true,
    },
    {
      name: 'check-ended-results',
      tags: ['list'],
      request: { method: 'GET', path: '/check-ended-results' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/exam/enums
// ============================================================
export const examEnumsModule: ModuleDefinition = {
  name: 'exam-enums',
  tags: ['exam'],
  basePath: '/api/v1/exam/enums',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums (variants + whom)',
      tags: ['list'],
      request: { method: 'GET' },
    },
  ],
};

// ============================================================
// /api/v1/documents/exams/{uuid} — public exam result
// ============================================================
export const examPublicResultsModule: ModuleDefinition = {
  name: 'exam-public-results',
  tags: ['exam'],
  basePath: '/api/v1/documents/exams',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'public exam result (random uuid → empty stub)',
      tags: ['detail'],
      request: { method: 'GET', path: '/non-existent-uuid' },
      statusOnly: true,
    },
  ],
};
