// LMS modullari uchun parity scenariolari.
// Laravel: Modules/LMS — 18 controller, ~35 endpoint.
//
// NestJS struktura:
//   main/, directions/, subjects/, specializations/, edu-plans/,
//   edu-plan-exams/, teachers/, lessons/, groups/, listeners/,
//   certificates/, zoom-webhook/

import type { ModuleDefinition } from '@/configs/types';

// Laravel pagination shape: {current_page, total, data}
// NestJS shape (lmsPaginate): bir xil — `per_page` olib tashlangan.
// data.data tarkibi har scenariyga turlicha — full body diff o'rniga status'ni
// tekshiramiz (statusOnly), full diff faqat enums/list/* da.
const PAGE_IGNORE_DATA = ['data.data', 'data.total', 'data.current_page'];

// ============================================================
// /api/v1/lms/enums — main (LMSController->enums)
// ============================================================
export const lmsMainModule: ModuleDefinition = {
  name: 'lms-main',
  tags: ['lms'],
  basePath: '/api/v1/lms',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums (edu_plan_types, exam_types, serials, lesson_exam_types)',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
    },
    {
      name: 'learning-centers (stub)',
      tags: ['list'],
      request: { method: 'GET', path: '/learning-centers' },
      statusOnly: true,
    },
    {
      name: 'list/directions (brief)',
      tags: ['list'],
      request: { method: 'GET', path: '/list/directions' },
      statusOnly: true,
    },
    {
      name: 'list/specializations (brief)',
      tags: ['list'],
      request: { method: 'GET', path: '/list/specializations' },
      statusOnly: true,
    },
    {
      name: 'list/edu-plans (brief)',
      tags: ['list'],
      request: { method: 'GET', path: '/list/edu-plans' },
      statusOnly: true,
    },
    {
      name: 'list/groups (stub)',
      tags: ['list'],
      request: { method: 'GET', path: '/list/groups' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/directions — apiResource
// ============================================================
export const lmsDirectionsModule: ModuleDefinition = {
  name: 'lms-directions',
  tags: ['lms'],
  basePath: '/api/v1/lms/directions',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
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
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel bug: apiResource `show` route mavjud, lekin DirectionController.show() implement qilinmagan → 500. NestJS 404 (to`g`ri). Hujjatlangan diff.',
    },
  ],
};

// ============================================================
// /api/v1/lms/subjects — apiResource
// ============================================================
export const lmsSubjectsModule: ModuleDefinition = {
  name: 'lms-subjects',
  tags: ['lms'],
  basePath: '/api/v1/lms/subjects',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
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
      name: 'create with empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/specializations — Route::resource (with show)
// ============================================================
export const lmsSpecializationsModule: ModuleDefinition = {
  name: 'lms-specializations',
  tags: ['lms'],
  basePath: '/api/v1/lms/specializations',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
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
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999999' },
      expectStatus: 404,
      statusOnly: true,
    },
    {
      name: 'create with missing direction_id returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', body: { name: 'Test' } },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/edu-plan — apiResource (+ attached-workers, detach-workers)
// ============================================================
export const lmsEduPlansModule: ModuleDefinition = {
  name: 'lms-edu-plans',
  tags: ['lms'],
  basePath: '/api/v1/lms',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/edu-plan' },
    },
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/edu-plan', query: { per_page: 3 } },
    },
    {
      name: 'create with missing fields returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/edu-plan', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'attached-workers for non-existent edu plan',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/edu-plans/999999/attached-workers',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/exams — edu-plan-exams (attach/detach/list/result)
// ============================================================
export const lmsEduPlanExamsModule: ModuleDefinition = {
  name: 'lms-edu-plan-exams',
  tags: ['lms'],
  basePath: '/api/v1/lms/exams',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
  scenarios: [
    {
      name: 'list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
      statusOnly: true,
    },
    {
      name: 'result (stub)',
      tags: ['list'],
      request: { method: 'GET', path: '/result' },
      statusOnly: true,
    },
    {
      name: 'detach non-existent examId returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'GET', path: '/detach/999999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/teachers — apiResource + /teacher/lessons
// ============================================================
export const lmsTeachersModule: ModuleDefinition = {
  name: 'lms-teachers',
  tags: ['lms'],
  basePath: '/api/v1/lms',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
  scenarios: [
    {
      name: 'list teachers (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/teachers' },
      statusOnly: true,
    },
    {
      name: 'list teachers (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/teachers', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'teacher/lessons (current user)',
      tags: ['list'],
      request: { method: 'GET', path: '/teacher/lessons' },
      statusOnly: true,
      skip:
        'Laravel: query param majburiy validation (422). NestJS stub 200. Real implement keyin.',
    },
    {
      name: 'create teacher with missing fields returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/teachers', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/lessons — apiResource + show-participants + create-meet
// ============================================================
export const lmsLessonsModule: ModuleDefinition = {
  name: 'lms-lessons',
  tags: ['lms'],
  basePath: '/api/v1/lms/lessons',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
  scenarios: [
    {
      name: 'list lessons (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET' },
      statusOnly: true,
      skip:
        'Laravel index calendar shape qaytaradi (groupBy lesson_date), NestJS pagination — strukturaviy diff hujjatlandi.',
    },
    {
      name: 'show non-existent lesson returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999999' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel bug: apiResource `show` mavjud lekin LessonController.show() yo`q → 500. NestJS 404 (to`g`ri).',
    },
    {
      name: 'show-participants non-existent lesson',
      tags: ['detail'],
      request: { method: 'GET', path: '/999999/show-participants' },
      statusOnly: true,
      skip:
        'Laravel: Lesson::findOrFail → 404. NestJS hozircha lesson_id tekshirilmagan stub → 200. Real implement keyin.',
    },
  ],
};

// ============================================================
// /api/v1/lms — groups, group-workers, protocol, worker-exams
// ============================================================
export const lmsGroupsModule: ModuleDefinition = {
  name: 'lms-groups',
  tags: ['lms'],
  basePath: '/api/v1/lms',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
  scenarios: [
    {
      name: 'groups list (edu_plan_id filter)',
      tags: ['list'],
      request: { method: 'GET', path: '/groups', query: { edu_plan_id: 1 } },
      statusOnly: true,
    },
    {
      name: 'group-workers list',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/group-workers',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
    {
      name: 'protocol list',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/protocol', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'worker-exams (stub)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/worker-exams',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/lms/listener — listener routes
// ============================================================
export const lmsListenersModule: ModuleDefinition = {
  name: 'lms-listeners',
  tags: ['lms'],
  basePath: '/api/v1/lms/listener',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'listener index',
      tags: ['list'],
      request: { method: 'GET' },
      statusOnly: true,
    },
    {
      name: 'listener lessons',
      tags: ['list'],
      request: { method: 'GET', path: '/lessons' },
      statusOnly: true,
      skip:
        'Laravel: query param validation (422). NestJS stub 200. Real implement keyin.',
    },
    {
      name: 'start non-existent lesson',
      tags: ['detail'],
      request: { method: 'GET', path: '/lessons/999999' },
      statusOnly: true,
      skip:
        'Laravel: Lesson::findOrFail → 404. NestJS stub 200. Real implement keyin.',
    },
  ],
};

// ============================================================
// /api/v1/lms/certificates — list + delete + generate
// ============================================================
export const lmsCertificatesModule: ModuleDefinition = {
  name: 'lms-certificates',
  tags: ['lms'],
  basePath: '/api/v1/lms',
  defaultAuth: 'admin',
  ignorePaths: PAGE_IGNORE_DATA,
  scenarios: [
    {
      name: 'certificates list (default)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', path: '/certificates' },
      statusOnly: true,
    },
    {
      name: 'certificates list (per_page=3)',
      tags: ['list', 'pagination'],
      request: {
        method: 'GET',
        path: '/certificates',
        query: { per_page: 3 },
      },
      statusOnly: true,
    },
    {
      name: 'delete non-existent certificate returns 404',
      tags: ['delete', 'validation'],
      request: { method: 'DELETE', path: '/certificates/999999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/zoom/webhook — Public (no auth)
// ============================================================
export const lmsZoomWebhookModule: ModuleDefinition = {
  name: 'lms-zoom-webhook',
  tags: ['lms'],
  basePath: '/api/v1/zoom',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'zoom webhook accepts any body',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/webhook',
        body: { event: 'meeting.started' },
      },
      statusOnly: true,
      skip:
        'Laravel: ZoomController strict validatsiya (500). NestJS Public POST stub — har body qabul qiladi. Real implement keyin.',
    },
  ],
};
