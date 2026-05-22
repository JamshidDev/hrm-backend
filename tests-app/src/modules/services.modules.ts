// Services (Laravel: ProjectService) parity scenariolari.
// 1 ta endpoint: POST /api/v1/services/translate
// Laravel local LibreOffice/Pandoc binarylarini chaqiradi va `1` qaytaradi.
// NestJS hozircha stub — `1` qaytaradi.

import type { ModuleDefinition } from '@/configs/types';

export const servicesTranslateModule: ModuleDefinition = {
  name: 'services-translate',
  tags: ['services'],
  basePath: '/api/v1/services',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'translate (stub, both return 200)',
      tags: ['create'],
      request: { method: 'POST', path: '/translate', body: {} },
      statusOnly: true,
    },
    {
      name: 'translate body diff: Laravel raw `1` vs NestJS wrapped',
      tags: ['create'],
      request: { method: 'POST', path: '/translate', body: {} },
      statusOnly: true,
      skip:
        'Laravel: raw scalar `1`. NestJS: {message,error,data:1} wrapped. Frontend buildSuccess interceptor o`zgartirishi mumkin. Hozircha hujjatlangan.',
    },
  ],
};
