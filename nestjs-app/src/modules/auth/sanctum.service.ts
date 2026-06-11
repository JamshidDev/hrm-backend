// Laravel Sanctum bilan to'liq mos token boshqaruv (cross-compat).
// Token format: "{id}|{plainText}". DB'da plainText'ning sha256 hash'i saqlanadi.

import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { personal_access_tokens } from '@/db/schema';
import type { AuthUser } from '@/common/types/auth-user.type';
import { nowDb } from '@/common/utils/datetime.util';

@Injectable()
export class SanctumService {
  private static readonly TOKENABLE_TYPE_USER = 'App\\Models\\User';

  constructor(@InjectDb() private readonly db: DataSource) {}

  async createToken(
    tokenable_id: number,
    name = 'sanctum',
    abilities: string[] = ['*'],
  ): Promise<string> {
    // Laravel Str::random(40) ekvivalenti — 40 belgili hex (20 byte).
    const plainTextToken = randomBytes(20).toString('hex');
    const hashedToken = createHash('sha256')
      .update(plainTextToken)
      .digest('hex');

    const [created] = await this.db
      .insert(personal_access_tokens)
      .values({
        tokenable_type: SanctumService.TOKENABLE_TYPE_USER,
        tokenable_id,
        name,
        token: hashedToken,
        abilities: JSON.stringify(abilities),
        created_at: nowDb(),
        updated_at: nowDb(),
      })
      .returning({ id: personal_access_tokens.id });

    return `${created.id}|${plainTextToken}`;
  }

  async verifyToken(fullToken: string): Promise<AuthUser | null> {
    const pipeIndex = fullToken.indexOf('|');
    if (pipeIndex === -1) return null;

    const tokenId = Number(fullToken.substring(0, pipeIndex));
    const plainTextToken = fullToken.substring(pipeIndex + 1);
    if (!Number.isFinite(tokenId) || tokenId <= 0 || !plainTextToken) {
      return null;
    }

    const hashedToken = createHash('sha256')
      .update(plainTextToken)
      .digest('hex');

    // Token + uning user'i bitta relational query'da.
    const token = await this.db.query.personal_access_tokens.findFirst({
      where: {
        id: tokenId,
        token: hashedToken,
        tokenable_type: SanctumService.TOKENABLE_TYPE_USER,
      },
      with: {
        user: {
          columns: {
            id: true,
            uuid: true,
            phone: true,
            worker_id: true,
            organization_id: true,
            status: true,
          },
        },
      },
    });

    if (!token) return null;

    // Expires tekshiruv (string vs string — TZ aralashmaydi).
    if (token.expires_at && token.expires_at < nowDb()) {
      return null;
    }

    const user = token.user;
    if (!user || !user.status) return null;

    return {
      id: user.id,
      uuid: user.uuid,
      phone: String(user.phone),
      worker_id: user.worker_id,
      organization_id: user.organization_id,
      status: user.status,
      token_id: token.id,
    };
  }

  async deleteToken(tokenId: number): Promise<void> {
    await this.db
      .delete(personal_access_tokens)
      .where(eq(personal_access_tokens.id, tokenId));
  }

  // Laravel $user->tokens()->delete() — user'ning BARCHA tokenlari.
  async deleteUserTokens(userId: number): Promise<void> {
    await this.db
      .delete(personal_access_tokens)
      .where(
        and(
          eq(
            personal_access_tokens.tokenable_type,
            SanctumService.TOKENABLE_TYPE_USER,
          ),
          eq(personal_access_tokens.tokenable_id, userId),
        ),
      );
  }
}
