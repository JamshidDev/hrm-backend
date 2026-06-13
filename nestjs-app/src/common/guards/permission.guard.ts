// PermissionGuard — Spatie permission middleware ekvivalenti.
// Usage: @UseGuards(AuthHybridGuard, PermissionGuard) + @Permission('users-write')

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '@/common/decorators/permission.decorator';
import { RequestContext } from '@/common/context/request.context';
import { PermissionService } from '@/shared/permission/permission.service';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ctx: RequestContext,
    private readonly perms: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const userId = this.ctx.user_or_fail.id;
    // Spatie `permission:a|b` — `|` bilan OR semantikasi (bittasi yetarli).
    const names = required.split('|').map((s) => s.trim());
    const granted = await this.perms.getUserPermissions(userId);
    const ok = names.some((n) => granted.has(n));
    if (!ok) {
      // Laravel Spatie PermissionMiddleware — FLAT { message } (error/data YO'Q),
      // xabar hardcoded inglizcha (locale'ga bog'liq emas).
      throw new RawHttpException(403, {
        message: 'User does not have the right permissions.',
      });
    }
    return true;
  }
}
