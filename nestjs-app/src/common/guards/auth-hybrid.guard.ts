// Laravel auth.hybrid middleware ekvivalenti.
// X-Auth-Type header bo'yicha sanctum yoki mobile (JWT — Phase 2B) tanlanadi.
// Auth o'tgach user'ni RequestContext (CLS) ga set qiladi.
// Laravel: response()->json([...], 401) — flat format (Helper::response()'siz).

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { SanctumService } from '@/modules/auth/sanctum.service';
import { RequestContext } from '@/common/context/request.context';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';
import type { AuthUser } from '@/common/types/auth-user.type';

@Injectable()
export class AuthHybridGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sanctumService: SanctumService,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authType = (
      (request.headers['x-auth-type'] as string) || ''
    ).toLowerCase();

    if (authType === 'sanctum') {
      const user = await this.handleSanctum(request);
      this.ctx.setUser(user);
      (request as Request & { user: AuthUser }).user = user;
      return true;
    }

    if (authType === 'mobile') {
      // TODO: Phase 2B
      throw new RawHttpException(401, {
        message: this.i18n.t('auth.mobile_jwt_not_implemented'),
      });
    }

    throw new RawHttpException(401, {
      message: this.i18n.t('auth.invalid_auth_type'),
    });
  }

  private async handleSanctum(request: Request): Promise<AuthUser> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new RawHttpException(401, {
        message: this.i18n.t('auth.unauthenticated_sanctum'),
      });
    }

    const user = await this.sanctumService.verifyToken(authHeader.substring(7));
    if (!user) {
      throw new RawHttpException(401, {
        message: this.i18n.t('auth.unauthenticated_sanctum'),
      });
    }
    return user;
  }
}
