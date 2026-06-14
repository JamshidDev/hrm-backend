// Laravel LogIntegrationApi (sanctum yo'li) parity: integration endpointlari
// auth:sanctum + permission:integration'dan tashqari, autentifikatsiyalangan
// foydalanuvchining `phone`i bo'yicha FAOL hmac_user (sanctum_user) talab qiladi:
//   HmacUser::where('public_key', $user->phone)->where('secret_type','sanctum_user')
//     ->first(); if (!$hmacUser || !$hmacUser->is_active) abort(401);
// Topilmasa 401 { message: '' } (Laravel abort(401) — bo'sh xabar).

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { hmac_users, users } from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';

@Injectable()
export class IntegrationHmacGuard implements CanActivate {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const userId = this.ctx.user_or_fail.id;
    const [u] = await this.db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const phone = u?.phone;
    if (phone == null) {
      throw new RawHttpException(401, { message: '' });
    }

    // public_key (varchar) — phone'ni string sifatida solishtiramiz.
    const [hu] = await this.db
      .select({ id: hmac_users.id })
      .from(hmac_users)
      .where(
        and(
          eq(hmac_users.public_key, String(phone)),
          eq(hmac_users.secret_type, 'sanctum_user'),
          eq(hmac_users.is_active, true),
        ),
      )
      .limit(1);

    if (!hu) {
      throw new RawHttpException(401, { message: '' });
    }
    return true;
  }
}
