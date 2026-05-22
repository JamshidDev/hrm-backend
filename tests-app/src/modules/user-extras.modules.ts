// User extras parity scenariolari. Laravel: UserController qo'shimcha endpointlari.

import type { ModuleDefinition } from '@/configs/types';

export const userExtrasModule: ModuleDefinition = {
  name: 'user-extras',
  tags: ['user'],
  basePath: '/api/v1/user',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'me',
      tags: ['detail'],
      request: { method: 'GET', path: '/me' },
      statusOnly: true,
      skip:
        'Laravel: UserService.me (full info: roles, permissions, organization, current_organization). NestJS minimal stub.',
    },
    {
      name: 'notifications',
      tags: ['list'],
      request: { method: 'GET', path: '/notifications' },
      statusOnly: true,
      skip: 'Laravel: real notifications jadval. NestJS stub.',
    },
    {
      name: 'notifications/mark-read empty body returns 422',
      tags: ['update', 'validation'],
      request: {
        method: 'POST',
        path: '/notifications/mark-read',
        body: {},
      },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'roles',
      tags: ['list'],
      request: { method: 'GET', path: '/roles' },
      statusOnly: true,
      skip: 'Laravel: Spatie permission package. NestJS stub.',
    },
    {
      name: 'change-organization',
      tags: ['update'],
      request: {
        method: 'PUT',
        path: '/change-organization',
        body: { organization_id: 1 },
      },
      statusOnly: true,
    },
    {
      name: 'update',
      tags: ['update'],
      request: { method: 'PUT', path: '/update', body: {} },
      statusOnly: true,
      skip: 'Laravel: phone/password update. NestJS stub.',
    },
    {
      name: 'organization-info',
      tags: ['detail'],
      request: { method: 'GET', path: '/organization-info' },
      statusOnly: true,
      skip: 'Laravel: organizations join. NestJS stub.',
    },
    {
      name: 'organization-hr',
      tags: ['list'],
      request: { method: 'GET', path: '/organization-hr' },
      statusOnly: true,
      skip: 'Laravel: HR users per organization. NestJS stub.',
    },
    {
      name: 'access-for-admin empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/access-for-admin', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
  ],
};
