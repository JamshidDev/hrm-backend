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

    if (!user || !passwordValid || !user.worker_id) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials'),
      );
    }

    // Laravel Helper::userRoleAndPermissions — foydalanuvchining joriy
    // tashkilotiga biriktirilgan kamida bitta roli bo'lishi shart
    // (model_has_roles.organization_id = user.organization_id).
    let hasOrgRole = false;
    if (user.organization_id != null) {
      const [orgRole] = await this.db
        .select({ role_id: model_has_roles.role_id })
        .from(model_has_roles)
        .where(
          and(
            eq(model_has_roles.model_id, user.id),
            eq(model_has_roles.model_type, USER_TYPE),
            eq(model_has_roles.organization_id, user.organization_id),
          ),
        )
        .limit(1);
      hasOrgRole = orgRole != null;
    }
    if (!hasOrgRole) {
      throw new BusinessException(
        401,
        this.i18n.t('messages.invalid_credentials'),
      );
    }

    if (!user.status) {
      throw new BusinessException(400, this.i18n.t('messages.user_block'));
    }

    // 30 kun ichida parol o'zgarmagan bo'lsa, foydalanuvchi yangilashi kerak.
    let mustChange = true;
    if (user.password_changed_at) {
      const daysSinceChange =
        (Date.now() - new Date(user.password_changed_at).getTime()) /
        (1000 * 60 * 60 * 24);
      mustChange = Math.abs(daysSinceChange) > 30;
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
