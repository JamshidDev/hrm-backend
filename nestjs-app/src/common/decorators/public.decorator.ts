// AuthHybridGuard'ni o'tkazib yuborish uchun (login va h.k.).

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
