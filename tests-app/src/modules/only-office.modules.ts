// OnlyOffice parity scenariolari. Laravel: routes/api.php GET /only-office/file/:uuid.

import type { ModuleDefinition } from '@/configs/types';

export const onlyOfficeModule: ModuleDefinition = {
  name: 'only-office',
  tags: ['document'],
  basePath: '/api/only-office',
  defaultAuth: 'guest',
  scenarios: [
    {
      name: 'file without model returns 403',
      tags: ['detail', 'validation'],
      request: { method: 'GET', path: '/file/00000000-0000-0000-0000-000000000000' },
      expectStatus: 403,
      statusOnly: true,
      skip:
        'Laravel: signed URL middleware kerak (signature parametri). Bizda Public stub. Real implement keyin.',
    },
    {
      name: 'file with invalid model returns 403',
      tags: ['detail', 'validation'],
      request: {
        method: 'GET',
        path: '/file/00000000-0000-0000-0000-000000000000',
        query: { model: 'invalid' },
      },
      expectStatus: 403,
      statusOnly: true,
      skip: 'Laravel: signed URL middleware. Hujjatlangan diff.',
    },
    {
      name: 'file with valid model + non-existent uuid returns 404',
      tags: ['detail', 'validation'],
      request: {
        method: 'GET',
        path: '/file/00000000-0000-0000-0000-000000000000',
        query: { model: 'contracts' },
      },
      expectStatus: 404,
      statusOnly: true,
      skip: 'Laravel: signed URL middleware. Hujjatlangan diff.',
    },
  ],
};
