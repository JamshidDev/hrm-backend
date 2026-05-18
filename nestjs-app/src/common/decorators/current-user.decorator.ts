// CLS'dan auth user olish uchun decorator (ixtiyoriy — service'larda RequestContext ishlatish afzal).
// Misol: profile(@CurrentUser() user: AuthUser)

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@/common/types/auth-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user ?? null;
  },
);
