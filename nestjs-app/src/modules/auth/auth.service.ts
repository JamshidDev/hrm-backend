// Login + logout. Laravel: AuthController + UserService.

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, desc, eq } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { authentication_log, model_has_roles } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { buildSuccess } from '@/common/utils/response.util';
import type { ApiSuccessResponse } from '@/common/types/api-response.type';
import { RequestContext } from '@/common/context/request.context';
import { nowDb } from '@/common/utils/datetime.util';
import { RedisService } from '@/shared/redis/redis.service';
import { PermissionService } from '@/shared/permission/permission.service';
import { SanctumService } from '@/modules/auth/sanctum.service';
import type { LoginDto } from '@/modules/auth/dto/auth.dto';

// Spatie model_has_roles.model_type — foydalanuvchi rollari.
const USER_TYPE = 'App\\Models\\User';

// Laravel AuthController login rate-limit: 5 urinish, 60s decay.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_DECAY_SECONDS = 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly sanctum: SanctumService,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly redis: RedisService,
    private readonly permissions: PermissionService,
  ) {}

  async login(dto: LoginDto): Promise<{
    access_token: string;
    message: string;
    must_change: boolean;
  }> {
    const phoneNumber = Number(dto.phone);

    // Laravel RateLimiter: key = login:{phone}|{ip}, 5 urinish → 429.
    const rateKey = `login:${dto.phone}|${this.ctx.ip ?? ''}`;
    if (await this.tooManyAttempts(rateKey)) {
      throw new BusinessException(
        429,
        this.i18n.t('messages.errors.too_many_attempts_try_again_later'),
      );
    }

    // Phone bo'yicha user'ni olamiz.
    const user = await this.db.query.users.findFirst({
      where: { phone: phoneNumber },
    });

    // Timing attack himoyasi: user yo'q bo'lsa ham bcrypt ishlatamiz.
    // PHP `$2y$` → Node bcrypt `$2b$` (algoritm bir xil, faqat prefix).
    const rawHash = user?.password ?? '$2b$12$fakeHashToPreventTimingAttack';
    const passwordValid = await bcrypt.compare(
      dto.password,
      rawHash.replace(/^\$2y\$/, '$2b$'),
    );

    // Laravel: !$user || !$user->worker_id → RateLimiter::hit + invalid_credentials.
    // (Diqqat: Laravel hit'ni FAQAT shu tarmoqda chaqiradi — noto'g'ri parolda emas.)
    if (!user || !user.worker_id) {
      await this.hit(rateKey);
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials'),
      );
    }

    // Laravel: !$passwordValid → invalid_credentials_password (alohida xabar).
    if (!passwordValid) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials_password'),
      );
    }

    // Laravel Helper::userRoleAndPermissions — joriy tashkilotга mos rol qidiriladi,
    // topilmasa $roles->first() qaytariladi (fallback). Shuning uchun bu tekshiruv
    // FAQAT foydalanuvchida hech qanday rol bo'lmaganda muvaffaqiyatsiz bo'ladi.
    const [anyRole] = await this.db
      .select({ role_id: model_has_roles.role_id })
      .from(model_has_roles)
      .where(
        and(
          eq(model_has_roles.model_id, user.id),
          eq(model_has_roles.model_type, USER_TYPE),
        ),
      )
      .limit(1);
    if (anyRole == null) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.not_found_role_or_worker'),
      );
    }

    if (!user.status) {
      throw new BusinessException(400, this.i18n.t('messages.user_block'));
    }

    // Laravel: !password_changed_at || abs(now()->diffInDays(password_changed_at)) > 30.
    // diffInDays butun kunga yaxlitlaydi (floor) — boundary parity uchun shu yerda ham floor.
    let mustChange = true;
    if (user.password_changed_at) {
      const daysSinceChange = Math.floor(
        Math.abs(
          (Date.now() - new Date(user.password_changed_at).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      mustChange = daysSinceChange > 30;
    }

    // Laravel: RateLimiter::clear($key) — muvaffaqiyatli login urinishlarni tozalaydi.
    await this.clear(rateKey);

    // Laravel: app()->isProduction() && !hasPermissionTo('integration') → tokens()->delete().
    // integration permission'li userlar (qurilma/integratsiya) bir nechta token saqlay oladi.
    if (process.env.NODE_ENV === 'production') {
      const hasIntegration = await this.permissions.hasPermission(
        user.id,
        'integration',
      );
      if (!hasIntegration) {
        await this.sanctum.deleteUserTokens(user.id);
      }
    }

    const accessToken = await this.sanctum.createToken(user.id);

    // Laravel: UserService::authenticationLog($user, 'login').
    await this.authenticationLog(user.id, 'login');

    return {
      access_token: accessToken,
      message: this.i18n.t('auth.login_success'),
      must_change: mustChange,
    };
  }

  async logout(): Promise<ApiSuccessResponse<unknown[]>> {
    const userId = this.ctx.user_or_fail.id;
    // Laravel: UserService::authenticationLog($user, 'logout') — oxirgi yozuvga logout_at.
    await this.authenticationLog(userId, 'logout');
    await this.sanctum.deleteToken(this.ctx.token_id);
    // Laravel Helper::response($string) shakli: { message, error: false, data: [] }
    return buildSuccess(this.i18n.t('auth.logout_success'), []);
  }

  // ---- Rate limiter (Laravel Illuminate RateLimiter parity, Redis-asosli) ----

  // attempts(key) >= maxAttempts.
  private async tooManyAttempts(key: string): Promise<boolean> {
    const n = await this.redis.main.get(key);
    return Number(n ?? 0) >= LOGIN_MAX_ATTEMPTS;
  }

  // hit(key, decay) — birinchi urinishda TTL o'rnatadi (keyingilar TTL'ni tiklamaydi).
  private async hit(key: string): Promise<void> {
    const n = await this.redis.main.incr(key);
    if (n === 1) {
      await this.redis.main.expire(key, LOGIN_DECAY_SECONDS);
    }
  }

  private async clear(key: string): Promise<void> {
    await this.redis.main.del(key);
  }

  // ---- authentication_log (Laravel UserService::authenticationLog parity) ----
  // login → INSERT (login_at, login_successful=true, ip, user_agent).
  // logout → oxirgi yozuvga logout_at UPDATE.
  private async authenticationLog(
    userId: number,
    status: 'login' | 'logout',
  ): Promise<void> {
    if (status === 'login') {
      await this.db.insert(authentication_log).values({
        authenticatable_type: USER_TYPE,
        authenticatable_id: userId,
        ip_address: this.ctx.ip,
        user_agent: this.ctx.user_agent,
        login_at: nowDb(),
        login_successful: true,
      });
      return;
    }

    // logout: Laravel latestAuthentication() — oxirgi (login_at DESC) yozuv.
    const [last] = await this.db
      .select({ id: authentication_log.id })
      .from(authentication_log)
      .where(
        and(
          eq(authentication_log.authenticatable_type, USER_TYPE),
          eq(authentication_log.authenticatable_id, userId),
        ),
      )
      .orderBy(desc(authentication_log.login_at))
      .limit(1);
    if (last) {
      await this.db
        .update(authentication_log)
        .set({ logout_at: nowDb() })
        .where(eq(authentication_log.id, last.id));
    }
  }
}
