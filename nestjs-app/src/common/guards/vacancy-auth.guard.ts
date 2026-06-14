// Laravel `Authenticate:vacancy` parity — sanctum guard, lekin `vacancy_users`
// provider (VacancyUser modeli). Token personal_access_tokens'da
// tokenable_type='Modules\Vacancy\Models\VacancyUser' bo'lishi shart. Oddiy
// HRM `users` tokeni (tokenable_type='App\Models\User') → topilmaydi → 401.
//   401 body: { message: 'Unauthenticated' } (Laravel auth:vacancy).

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { personal_access_tokens } from '@/db/schema';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';

@Injectable()
export class VacancyAuthGuard implements CanActivate {
  private static readonly TOKENABLE_TYPE = 'Modules\\Vacancy\\Models\\VacancyUser';

  constructor(@InjectDb() private readonly db: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { vacancy_user_id?: number }
    >();
    const header = (req.headers['authorization'] as string | undefined) ?? '';
    const m = header.match(/^Bearer\s+(.+)$/i);
    const full = m ? m[1] : '';
    const pipe = full.indexOf('|');
    if (pipe === -1) this.unauthorized();

    const id = Number(full.slice(0, pipe));
    const plain = full.slice(pipe + 1);
    if (!Number.isFinite(id) || id <= 0 || !plain) this.unauthorized();

    const hashed = createHash('sha256').update(plain).digest('hex');
    const [tok] = await this.db
      .select({ tokenable_id: personal_access_tokens.tokenable_id })
      .from(personal_access_tokens)
      .where(
        and(
          eq(personal_access_tokens.id, id),
          eq(personal_access_tokens.token, hashed),
          eq(personal_access_tokens.tokenable_type, VacancyAuthGuard.TOKENABLE_TYPE),
        ),
      )
      .limit(1);

    if (!tok) this.unauthorized();
    req.vacancy_user_id = tok!.tokenable_id;
    return true;
  }

  private unauthorized(): never {
    throw new RawHttpException(401, { message: 'Unauthenticated' });
  }
}
