// @Permission('users-write') — endpoint uchun zarur permission.
// Spatie middleware('permission:users-write') ekvivalenti.

import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';
export const Permission = (name: string) => SetMetadata(PERMISSION_KEY, name);
