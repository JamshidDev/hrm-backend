// Laravel EconomistTelegramMiddleware parity:
//   $token = header('Bot-Token') ?? input('bot_token');
//   if (!$token) → 401
//   $orgId = Organization::where('bot_token', $token)->first()?->id;
//   if (!$orgId) → 401
//   $request->merge(['organization_id' => $orgId]);
// Yo'q/noto'g'ri token → 401 { message: 'Unauthorized.' }; topilsa req.organization_id.

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { organizations } from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RawHttpException } from '@/common/exceptions/raw-http.exception';

@Injectable()
export class EconomistTelegramGuard implements CanActivate {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { organization_id?: number }
    >();
    const token =
      (req.headers['bot-token'] as string | undefined) ??
      (req.body as { bot_token?: string } | undefined)?.bot_token ??
      (req.query as { bot_token?: string } | undefined)?.bot_token;

    if (!token) {
      throw new RawHttpException(401, { message: 'Unauthorized.' });
    }

    const [org] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.bot_token, token), notDeleted(organizations)))
      .limit(1);

    if (!org) {
      throw new RawHttpException(401, { message: 'Unauthorized.' });
    }

    // Laravel: $request->merge(['organization_id' => $orgId]).
    req.organization_id = org.id;
    return true;
  }
}
