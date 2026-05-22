// User Face parity scenariolari. Laravel: UserFaceController + UserController (socket).

import type { ModuleDefinition } from '@/configs/types';

export const userFaceModule: ModuleDefinition = {
  name: 'user-face',
  tags: ['user'],
  basePath: '/api/v1/user',
  defaultAuth: 'admin',
  scenarios: [
    {
      name: 'face/recognition empty body returns 422',
      tags: ['create', 'validation'],
      request: { method: 'POST', path: '/face/recognition', body: {} },
      expectStatus: 422,
      statusOnly: true,
    },
    {
      name: 'face/recognition (stub)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/face/recognition',
        body: { photo: 'base64-data' },
      },
      statusOnly: true,
      skip:
        'Laravel: FaceRecognitionService.recognize (face SDK). NestJS stub. Real implement keyin.',
    },
    {
      name: 'face/liveness/start',
      tags: ['create'],
      request: { method: 'POST', path: '/face/liveness/start', body: {} },
      statusOnly: true,
    },
    {
      name: 'socket/verify-token',
      tags: ['detail'],
      request: { method: 'GET', path: '/socket/verify-token' },
      statusOnly: true,
    },
    {
      name: 'socket/users-photos (stub)',
      tags: ['create'],
      request: {
        method: 'POST',
        path: '/socket/users-photos',
        body: { user_ids: [1, 2] },
      },
      statusOnly: true,
      skip:
        'Laravel: UserService.updateUserPhotos (file system + worker photos). NestJS stub.',
    },
  ],
};
