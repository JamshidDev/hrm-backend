// PermissionGuard — Spatie permission middleware ekvivalenti.
// Usage: @UseGuards(AuthHybridGuard, PermissionGuard) + @Permission('users-write')

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { PERMISSION_KEY } from '@/common/decorators/permission.decorator';
import { RequestContext } from '@/common/context/request.context';
import { PermissionService } from '@/shared/permission/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ctx: RequestContext,
    private readonly perms: PermissionService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const userId = this.ctx.user_or_fail.id;
    const ok = await this.perms.hasPermission(userId, required);
    if (!ok) {
      throw new ForbiddenException(this.i18n.t('messages.permission_denied'));
    }
    return true;
  }
}
