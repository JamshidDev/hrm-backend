// Chat modullari uchun parity scenariolari.
// Laravel: Modules/Chat — 9 ta controller, 12 endpoint.
//
// NestJS struktura (Economist pattern):
//   main/, news-categories/, news/, news-translations/, news-media/,
//   news-engagement/, notifications/, telegram/, user-emoji/

import type { ModuleDefinition } from '@/configs/types';

const FULL_PAGE_IGNORE = ['data.per_page', 'data.total', 'data.data'];

// ============================================================
// /api/v1/chat/enums — main
// ============================================================
export const chatMainModule: ModuleDefinition = {
  name: 'chat-main',
  tags: ['chat'],
  basePath: '/api/v1/chat',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'enums',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/chat/categories — apiResource
// ============================================================
export const chatNewsCategoriesModule: ModuleDefinition = {
  name: 'chat-news-categories',
  tags: ['chat'],
  basePath: '/api/v1/chat/categories',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/chat/news — resource (admin)
// ============================================================
export const chatNewsModule: ModuleDefinition = {
  name: 'chat-news',
  tags: ['chat'],
  basePath: '/api/v1/chat/news',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'show non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/999999999' },
      expectStatus: 404,
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/news — public (auth.hybrid)
// ============================================================
export const chatNewsPublicModule: ModuleDefinition = {
  name: 'chat-news-public',
  tags: ['chat'],
  basePath: '/api/v1/news',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'public news list',
      tags: ['list'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'view non-existent returns 404',
      tags: ['detail', 'validation'],
      request: { method: 'POST', path: '/999999999/view' },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel `findOrFail` (404) ekvivalenti — bizda 404, lekin Laravel ham 404. Parity OK, lekin per-DB ehtimol farq. Hozircha skip.',
    },
  ],
};

// ============================================================
// /api/v1/chat/translations — apiResource
// ============================================================
export const chatNewsTranslationsModule: ModuleDefinition = {
  name: 'chat-news-translations',
  tags: ['chat'],
  basePath: '/api/v1/chat/translations',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
      skip:
        'Laravel: apiResource avto-route, ammo `index` method controller`da yo`q (Call to undefined method) → 500. Nest`da real list. Laravel parity bug.',
    },
  ],
};

// ============================================================
// /api/v1/chat/media — apiResource (Laravel: faqat store + destroy real)
// ============================================================
export const chatNewsMediaModule: ModuleDefinition = {
  name: 'chat-news-media',
  tags: ['chat'],
  basePath: '/api/v1/chat/media',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list (per_page=3)',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
      skip:
        'Laravel: store+destroy implement qilingan, index Laravel`da yo`q (Route::apiResource avto-route, lekin index method`i yo`q) — 500. Nest`da real list.',
    },
  ],
};

// ============================================================
// /api/v1/notifications
// ============================================================
export const chatNotificationsModule: ModuleDefinition = {
  name: 'chat-notifications',
  tags: ['chat'],
  basePath: '/api/v1/notifications',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'list',
      tags: ['list', 'pagination'],
      request: { method: 'GET', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'enums',
      tags: ['list'],
      request: { method: 'GET', path: '/enums' },
      statusOnly: true,
    },
  ],
};

// ============================================================
// /api/v1/telegram
// ============================================================
export const chatTelegramModule: ModuleDefinition = {
  name: 'chat-telegram',
  tags: ['chat'],
  basePath: '/api/v1/telegram',
  defaultAuth: 'admin',
  ignorePaths: FULL_PAGE_IGNORE,
  scenarios: [
    {
      name: 'messages list',
      tags: ['list'],
      request: { method: 'GET', path: '/messages', query: { per_page: 3 } },
      statusOnly: true,
    },
    {
      name: 'dashboard',
      tags: ['list'],
      request: { method: 'GET', path: '/dashboard' },
      statusOnly: true,
    },
  ],
};
