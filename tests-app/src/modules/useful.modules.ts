// Useful parity scenariolari. Laravel: UsefulController (2 endpoint).

import type { ModuleDefinition } from '@/configs/types';

export const usefulModule: ModuleDefinition = {
  name: 'useful',
  tags: ['useful'],
  basePath: '/api/v1/useful',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'codex (uz)',
      tags: ['detail'],
      request: { method: 'GET', path: '/codex' },
      statusOnly: true,
      skip:
        'Laravel: file_get_contents resumes/documents/codex.html. NestJS stub bo`sh string. Real implement file system o`qish keyin.',
    },
    {
      name: 'leaders (organization tree)',
      tags: ['list'],
      request: { method: 'GET', path: '/leaders' },
      statusOnly: true,
      skip:
        'Laravel: NestedSet toTree() + leaders join. NestJS stub flat list. Real implement keyin.',
    },
  ],
};
