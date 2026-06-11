// Login + logout. Laravel: AuthController + UserService.

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { and, eq } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { model_has_roles } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { buildSuccess } from '@/common/utils/response.util';
import type { ApiSuccessResponse } from '@/common/types/api-response.type';
import { RequestContext } from '@/common/context/request.context';
import { SanctumService } from '@/modules/auth/sanctum.service';
import type { LoginDto } from '@/modules/auth/dto/auth.dto';

// Spatie model_has_roles.model_type — foydalanuvchi rollari.
const USER_TYPE = 'App\\Models\\User';

@Injectable()
export class AuthService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly sanctum: SanctumService,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async login(dto: LoginDto): Promise<{
    access_token: string;
    message: string;
    must_change: boolean;
  }> {
    const phoneNumber = Number(dto.phone);

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

    // Laravel: !$user || !$user->worker_id → invalid_credentials.
    // (passwordValid bu tekshiruvdan ayrildi — alohida xabar qaytaradi.)
    if (!user || !user.worker_id) {
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

    const accessToken = await this.sanctum.createToken(user.id);

    return {
      access_token: accessToken,
      message: this.i18n.t('auth.login_success'),
      must_change: mustChange,
    };
  }

  async logout(): Promise<ApiSuccessResponse<unknown[]>> {
    await this.sanctum.deleteToken(this.ctx.token_id);
    // Laravel Helper::response($string) shakli: { message, error: false, data: [] }
    return buildSuccess(this.i18n.t('auth.logout_success'), []);
  }
}
