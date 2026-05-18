// OAuth auth-code flow. Laravel: OAuthService.

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { oauth_client_codes } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { plusMinutesDb, nowDb } from '@/common/utils/datetime.util';
import type {
  OAuthGenerateCodeDto,
  OAuthCheckCodeDto,
} from '@/modules/auth/dto/auth.dto';
import type { ExchangeAuthCodeUser } from '@/modules/auth/types/oauth.type';
import { AuthMapper } from '@/modules/auth/auth.mapper';

@Injectable()
export class OAuthService {
  private static readonly AUTH_CODE_TTL_MINUTES = 10;

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  async generateAuthCode(dto: OAuthGenerateCodeDto): Promise<{ url: string }> {
    const user_id = this.ctx.user_id;

    const client = await this.db.query.oauth_clients.findFirst({
      where: { client_id: dto.client_id, in_active: true },
      columns: { id: true, redirect_uri: true },
    });
    if (!client) {
      throw new BusinessException(404, 'Client not found');
    }

    // Bir foydalanuvchi uchun shu client + state takror bo'lmasligi kerak.
    const existingCode = await this.db.query.oauth_client_codes.findFirst({
      where: {
        oauth_client_id: client.id,
        user_id,
        state: dto.state,
      },
      columns: { id: true },
    });
    if (existingCode) {
      throw new BusinessException(400, 'Auth code already exist');
    }

    const code = randomBytes(20).toString('hex');

    await this.db.insert(oauth_client_codes).values({
      oauth_client_id: client.id,
      user_id,
      code,
      // Server local time (PG TZ bilan mos) — UTC ishlatsak NOW() bilan farq chiqadi.
      expires_at: plusMinutesDb(OAuthService.AUTH_CODE_TTL_MINUTES),
      state: dto.state,
      scope: dto.scope,
    });

    return {
      url: `${client.redirect_uri}?code=${code}&state=${dto.state}&scope=${dto.scope}`,
    };
  }

  async exchangeAuthCode(
    dto: OAuthCheckCodeDto,
  ): Promise<{ user: ExchangeAuthCodeUser }> {
    // Laravel: client_secret ?? null bilan qidiradi. Bizda secret notNull,
    // shuning uchun secret kelmagan bo'lsa hech narsa topilmaydi (Laravel xatti-harakatiga mos).
    if (!dto.client_secret) {
      throw new BusinessException(404, 'Client not found');
    }

    const client = await this.db.query.oauth_clients.findFirst({
      where: {
        client_id: dto.client_id,
        client_secret: dto.client_secret,
        in_active: true,
      },
      columns: { id: true },
    });
    if (!client) {
      throw new BusinessException(404, 'Client not found');
    }

    // Auth code + bog'liq user'ni bitta query'da yuklaymiz.
    const authCode = await this.db.query.oauth_client_codes.findFirst({
      where: {
        oauth_client_id: client.id,
        code: dto.code,
      },
      with: { user: true },
    });

    // Laravel `where('expires_at', '>=', now())` — qo'lda tekshiramiz (string vs string).
    if (!authCode || !authCode.expires_at || authCode.expires_at < nowDb()) {
      throw new BusinessException(404, 'Auth code not found');
    }

    // Code'ni used qilamiz — atomik (kelajakda yana yozish qo'shilsa, transaction kengaytiriladi).
    await this.db.transaction(async (tx) => {
      await tx
        .update(oauth_client_codes)
        .set({ used: true })
        .where(eq(oauth_client_codes.id, authCode.id));
    });

    const user = authCode.user;
    if (!user) {
      throw new BusinessException(404, 'User not found');
    }

    // Laravel Eloquent User'ning $hidden'dan tashqari hamma fieldlarini qaytaradi.
    return { user: AuthMapper.toExchangeAuthCodeUser(user) };
  }
}
