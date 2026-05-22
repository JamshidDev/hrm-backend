// Telegram bot parity scenariolari. Laravel: TelegramController (9 endpoint).
// Laravel middleware 'telegram' bilan himoyalangan (bot token + sign check).
// NestJS hozircha @Public stub — middleware real implement keyin.

import type { ModuleDefinition } from '@/configs/types';

const TG_BOT_SKIP =
  'Laravel: telegram middleware (bot token verify). NestJS Public stub. Real implement keyin.';

export const telegramBotModule: ModuleDefinition = {
  name: 'telegram-bot',
  tags: ['telegram'],
  basePath: '/api/v1/telegram',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'auth/:chatId user info',
      tags: ['detail'],
      request: { method: 'GET', path: '/auth/123456789' },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'auth/check (phone+pin)',
      tags: ['auth'],
      request: {
        method: 'POST',
        path: '/auth/check',
        body: { phone: '995016004', pin: '31308942720074' },
      },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'auth/check with empty body returns 422',
      tags: ['auth', 'validation'],
      request: { method: 'POST', path: '/auth/check', body: {} },
      expectStatus: 422,
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'auth/register (uuid+chat_id)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/auth/register',
        body: {
          uuid: '00000000-0000-0000-0000-000000000000',
          chat_id: 999999999,
        },
      },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'auth/:chatId DELETE',
      tags: ['delete'],
      request: { method: 'DELETE', path: '/auth/999999999' },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'profile',
      tags: ['detail'],
      request: { method: 'GET', path: '/profile' },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'petition-types',
      tags: ['list'],
      request: { method: 'GET', path: '/petition-types' },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'menu/services',
      tags: ['list'],
      request: { method: 'GET', path: '/menu/services' },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'menu/get-service',
      tags: ['detail'],
      request: { method: 'GET', path: '/menu/get-service' },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
    {
      name: 'menu/set-service (POST)',
      tags: ['create'],
      request: { method: 'POST', path: '/menu/set-service', body: {} },
      statusOnly: true,
      skip: TG_BOT_SKIP,
    },
  ],
};
