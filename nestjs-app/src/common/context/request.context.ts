// Request scope'idagi user, lang va meta'larni service'larga taqdim etadi.

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import type { AuthUser } from '@/common/types/auth-user.type';
import { CLS_KEYS, DEFAULT_LANG, type Lang } from '@/common/context/cls.types';

@Injectable()
export class RequestContext {
  constructor(private readonly cls: ClsService) {}

  get user(): AuthUser | null {
    return this.cls.get(CLS_KEYS.USER) ?? null;
  }

  // Auth majburiy endpointlar uchun: yo'q bo'lsa 401 throw qiladi.
  // TypeScript ham null bo'lmasligini biladi.
  get user_or_fail(): AuthUser {
    const user = this.user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user;
  }

  get user_id(): number {
    return this.user_or_fail.id;
  }

  get worker_id(): number | null {
    return this.user_or_fail.worker_id;
  }

  get organization_id(): number | null {
    return this.user_or_fail.organization_id;
  }

  get token_id(): number {
    return this.user_or_fail.token_id;
  }

  setUser(user: AuthUser): void {
    this.cls.set(CLS_KEYS.USER, user);
  }

  get lang(): Lang {
    return this.cls.get(CLS_KEYS.LANG) ?? DEFAULT_LANG;
  }

  get request_id(): string {
    return this.cls.getId();
  }

  get device_id(): string | null {
    return this.cls.get(CLS_KEYS.DEVICE_ID) ?? null;
  }

  get ip(): string | null {
    return this.cls.get(CLS_KEYS.IP) ?? null;
  }

  get user_agent(): string | null {
    return this.cls.get(CLS_KEYS.USER_AGENT) ?? null;
  }
}
