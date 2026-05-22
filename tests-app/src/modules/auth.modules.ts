// Auth + User profile modullari.

import type { ModuleDefinition } from '@/configs/types';

// Auth — login va boshqa public endpointlar.
// Login endpointi token qaytaradi, har request'da turlicha → mask qilamiz.
export const authModule: ModuleDefinition = {
  name: 'auth',
  tags: ['auth'],
  basePath: '/api/auth',
  defaultAuth: 'guest',
  // Login response'ida access_token har request'da o'zgaradi.
  maskPaths: ['data.access_token', 'access_token'],
  scenarios: [
    {
      // Phone valid format (9 digits), password valid length, lekin user yo'q.
      name: 'login with non-existent phone returns 401',
      tags: ['auth', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '123456789', password: 'validpassword123' },
      },
      expectStatus: 401,
      statusOnly: true,
    },
    {
      // Password min:8 dan kichik — 422 validation error.
      name: 'login with too-short password returns 422',
      tags: ['auth', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '995016004', password: 'short' },
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      // Phone format invalid (not 9 digits) — 422.
      name: 'login with invalid phone format returns 422',
      tags: ['auth', 'validation'],
      request: {
        method: 'POST',
        path: '/login',
        body: { phone: '12345', password: 'validpassword123' },
      },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

export const userModule: ModuleDefinition = {
  name: 'user',
  tags: ['user'],
  basePath: '/api/v1/user',
  defaultAuth: 'admin',
  // Worker photo MinIO signed URL — har request'da signature o'zgaradi.
  maskPaths: ['data.worker.photo'],
  scenarios: [
    {
      name: 'profile (current admin)',
      tags: ['detail'],
      request: { method: 'GET', path: '/profile' },
    },
  ],
};

// ============================================================
// /api/auth/mobile — MobileAuthController (2 endpoint)
// ============================================================
export const mobileAuthModule: ModuleDefinition = {
  name: 'mobile-auth',
  tags: ['auth'],
  basePath: '/api/auth/mobile',
  defaultAuth: 'guest',
  maskPaths: ['access_token', 'refresh_token'],
  scenarios: [
    {
      name: 'login (stub)',
      tags: ['auth'],
      request: {
        method: 'POST',
        path: '/login',
        body: {
          phone: '995016004',
          device_model: 'Test',
          platform: 'ios',
          login_type: 'password',
        },
      },
      statusOnly: true,
      skip:
        'Laravel: full JWT issue + phone/password verify, face match. NestJS stub. Real implement Phase 2B.',
    },
    {
      name: 'refresh (stub)',
      tags: ['auth'],
      request: { method: 'POST', path: '/refresh', body: {} },
      statusOnly: true,
      skip: 'Laravel: JWT refresh. NestJS stub.',
    },
    {
      name: 'login with empty body returns 422',
      tags: ['auth', 'validation'],
      request: { method: 'POST', path: '/login', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/user/mobile — UserMobileController + MobileVersionController + MobileFaceCheckInOutController (19 endpoint)
// ============================================================
export const userMobileModule: ModuleDefinition = {
  name: 'user-mobile',
  tags: ['user'],
  basePath: '/api/v1/user/mobile',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
      statusOnly: true,
      skip:
        'Laravel: WorkerApplicationTypeEnum::mobileList() + ApplicationEducationTypeEnum::list(). NestJS stub. Body shape farq qiladi — kontent moslash keyin.',
    },
    {
      name: 'logout',
      tags: ['auth'],
      request: { method: 'GET', path: '/logout' },
      statusOnly: true,
      skip: 'Laravel: MobileAuthController.logout (JWT). NestJS stub. Real implement keyin.',
    },
    {
      name: 'my-schedules',
      tags: ['list'],
      request: { method: 'GET', path: '/my-schedules' },
      statusOnly: true,
      skip: 'Laravel: worker schedule joinlari. NestJS stub.',
    },
    {
      name: 'personal-list',
      tags: ['list'],
      request: { method: 'GET', path: '/personal-list' },
      statusOnly: true,
      skip: 'Laravel: worker personal info. NestJS stub.',
    },
    {
      name: 'work-info',
      tags: ['detail'],
      request: { method: 'GET', path: '/work-info' },
      statusOnly: true,
      skip: 'Laravel: UserInfoService.buildWorkInfo. NestJS qisman implement.',
    },
    {
      name: 'documents',
      tags: ['list'],
      request: { method: 'GET', path: '/documents' },
      statusOnly: true,
      skip: 'Laravel: worker documents. NestJS stub.',
    },
    {
      name: 'turnstile-events',
      tags: ['list'],
      request: { method: 'GET', path: '/turnstile-events' },
      statusOnly: true,
      skip: 'Laravel: turnstile events. NestJS stub.',
    },
    {
      name: 'get-salary-months',
      tags: ['list'],
      request: { method: 'GET', path: '/get-salary-months' },
      statusOnly: true,
      skip: 'Laravel: external salary API. NestJS stub.',
    },
    {
      name: 'get-salary (with month)',
      tags: ['detail'],
      request: { method: 'GET', path: '/get-salary', query: { month: '2026-05' } },
      statusOnly: true,
      skip: 'Laravel: external salary API. NestJS stub.',
    },
    {
      name: 'my-vacations',
      tags: ['list'],
      request: { method: 'GET', path: '/my-vacations' },
      statusOnly: true,
      skip: 'Laravel: worker vacations. NestJS stub.',
    },
    {
      name: 'my-resume (PDF)',
      tags: ['detail'],
      request: { method: 'GET', path: '/my-resume' },
      statusOnly: true,
      skip: 'Laravel: PDF binary. NestJS JSON stub. Real implement keyin.',
    },
    {
      name: 'last-event',
      tags: ['detail'],
      request: { method: 'GET', path: '/last-event' },
      statusOnly: true,
      skip: 'Laravel: FaceCheckInOutService. NestJS stub.',
    },
    {
      name: 'turnstile-stats',
      tags: ['detail'],
      request: { method: 'GET', path: '/turnstile-stats' },
      statusOnly: true,
      skip: 'Laravel: turnstile today stats. NestJS stub.',
    },
    {
      name: 'turnstile-show-stats',
      tags: ['list'],
      request: { method: 'GET', path: '/turnstile-show-stats' },
      statusOnly: true,
      skip: 'Laravel: monthly stats. NestJS stub.',
    },
    {
      name: 'version check (POST)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/version',
        body: { version: '1.0.0' },
      },
      statusOnly: true,
      skip: 'Laravel: MobileVersionController.check. NestJS stub.',
    },
    {
      name: 'update-password (POST)',
      tags: ['update'],
      request: {
        method: 'POST',
        path: '/update-password',
        body: { current_password: 'x', new_password: 'y' },
      },
      statusOnly: true,
      skip: 'Laravel: bcrypt verify + update. NestJS stub.',
    },
    {
      name: 'update-fcm (POST)',
      tags: ['update'],
      request: {
        method: 'POST',
        path: '/update-fcm',
        body: { fcm_token: 'abc-fcm-token' },
      },
      statusOnly: true,
    },
    {
      name: 'check-location (POST)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/check-location',
        body: { latitude: 41.3, longitude: 69.2 },
      },
      statusOnly: true,
      skip: 'Laravel: PostGIS distance check. NestJS stub.',
    },
    {
      name: 'turnstile-start-liveness (POST)',
      tags: ['create'],
      request: { method: 'POST', path: '/turnstile-start-liveness', body: {} },
      statusOnly: true,
      skip: 'Laravel: face liveness session start. NestJS stub.',
    },
  ],
};
