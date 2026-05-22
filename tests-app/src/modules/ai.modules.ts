// AI OpenAI parity scenariolari. Laravel: OpenAIController (4 endpoint).

import type { ModuleDefinition } from '@/configs/types';

export const aiModule: ModuleDefinition = {
  name: 'ai',
  tags: ['ai'],
  basePath: '/api/v1/ai',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'list (grouped history)',
      tags: ['list'],
      request: { method: 'GET', path: '/list' },
      statusOnly: true,
    },
    {
      name: 'questions (by date)',
      tags: ['list'],
      request: {
        method: 'GET',
        path: '/questions',
        query: { date: '2026-05-18' },
      },
      statusOnly: true,
    },
    {
      name: 'lawyer (stub)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/lawyer',
        body: { question: 'test' },
      },
      statusOnly: true,
      skip:
        'Laravel: StreamedResponse (SSE) OpenAI API. NestJS sync stub. Real implement (OpenAI SDK + streaming) keyin.',
    },
    {
      name: 'lawyer with empty question returns 400',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/lawyer', body: { question: '' } },
      expectStatus: 400,
      statusOnly: true,
    },
    {
      name: 'like non-existent question returns 404',
      tags: ['update', 'validation'],
      request: {
        method: 'POST',
        path: '/questions/999999999/like',
        body: { like: true },
      },
      expectStatus: 404,
      statusOnly: true,
      skip:
        'Laravel: ratingQuestion(id, bool) — find or no-op. NestJS 404 BusinessException. Hujjatlangan diff.',
    },
  ],
};
