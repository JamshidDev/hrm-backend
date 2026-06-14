// Chat telegram service. Laravel: Modules\Chat\...\TelegramController.
//
// `telegram_messages` — backend bot yuborgan xabarlar tarixi. Org-scope:
// WorkerPosition::filter($user)->select('worker_id') → user.worker_id ∈ shu worker_id'lar.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  telegram_messages,
  users,
  workers,
  worker_positions,
} from '@/db/schema';
import type { TelegramMessagesQueryDto } from '@/modules/chat/telegram/dto/telegram.dto';

// Laravel App\Enums\TelegramMessageTypeEnum (1..6) → i18n label kalitlari.
const TELEGRAM_TYPE_LABELS: Record<number, string> = {
  1: 'messages.chat.telegram.messages.types.birthday',
  2: 'messages.chat.telegram.messages.types.vacations',
  3: 'messages.chat.telegram.messages.types.med',
  4: 'messages.chat.telegram.messages.types.passport',
  5: 'messages.chat.telegram.messages.types.mobile_app',
  6: 'messages.chat.telegram.messages.types.turnstile_stats',
};
const TELEGRAM_TYPE_IDS = [1, 2, 3, 4, 5, 6];

@Injectable()
export class ChatTelegramService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
  ) {}

  // Laravel: $userIds = WorkerPosition::filter($user, request)->select('worker_id');
  //          TelegramMessage::whereHas('user', whereIn('worker_id', $userIds)).
  // → telegram_messages.user_id ∈ (users whose worker_id ∈ scoped worker_positions).
  private async scopedUserCond(q: TelegramMessagesQueryDto) {
    const orgCond = await this.scope.whereOrg(
      worker_positions.organization_id,
      {
        organizations: q.organizations,
        organization_id: q.organization_id,
      },
    );
    const scopedWorkerIds = this.db
      .select({ worker_id: worker_positions.worker_id })
      .from(worker_positions)
      // Laravel WorkerPosition::filter — where('status', ACTIVE=2) + filterByOrganizations.
      .where(
        and(notDeleted(worker_positions), eq(worker_positions.status, 2), orgCond),
      );
    const scopedUserIds = this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.worker_id, scopedWorkerIds));
    return inArray(telegram_messages.user_id, scopedUserIds);
  }

  // i18n type label.
  private typeName(id: number | null, lang: string): string {
    const key = id != null ? TELEGRAM_TYPE_LABELS[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  private toDateTimeString(v: string | null): string | null {
    if (!v) return null;
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
    return m ? `${m[1]} ${m[2]}` : v;
  }

  /**
   * GET /telegram/messages — TelegramMessageResource, org-scope (WorkerPosition::filter),
   * orderByDesc('id'), paginate.
   */
  async messages(q: TelegramMessagesQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;
    const lang = this.ctx.lang;

    const where = and(
      notDeleted(telegram_messages),
      await this.scopedUserCond(q),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(telegram_messages)
        .where(where)
        .orderBy(desc(telegram_messages.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(telegram_messages).where(where),
    ]);

    // user.worker batch — UserWorkerResource.
    const userIds = [
      ...new Set(
        rows.map((r) => r.user_id).filter((id): id is number => id != null),
      ),
    ];
    const userRows = userIds.length
      ? await this.db
          .select({
            id: users.id,
            w_id: workers.id,
            w_photo: workers.photo,
            w_last: workers.last_name,
            w_first: workers.first_name,
            w_middle: workers.middle_name,
          })
          .from(users)
          .leftJoin(workers, eq(workers.id, users.worker_id))
          .where(inArray(users.id, userIds))
      : [];
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const data = await Promise.all(
      rows.map(async (r) => {
        const u = userMap.get(r.user_id);
        const user = u
          ? {
              id: u.id,
              worker: u.w_id
                ? {
                    id: u.w_id,
                    photo: await this.minio.fileUrl(u.w_photo),
                    last_name: u.w_last,
                    first_name: u.w_first,
                    middle_name: u.w_middle,
                  }
                : null,
            }
          : null;
        return {
          id: r.id,
          user,
          type: { id: r.type, name: this.typeName(r.type, lang) },
          created_at: this.toDateTimeString(r.created_at),
          message: r.message,
          status: r.status,
          // Laravel TelegramMessageResource `$this->error` — DB ustuni `error_msg`,
          // `error` atributi yo'q → Laravel null qaytaradi (parity).
          error: null,
        };
      }),
    );

    return { current_page: page, total: Number(total), data };
  }

  /**
   * GET /telegram/dashboard — Laravel: type bo'yicha GROUP BY COUNT, barcha enum
   * turlari uchun (0 ham). Org-scope WorkerPosition::filter.
   */
  async dashboard(q: TelegramMessagesQueryDto) {
    const lang = this.ctx.lang;
    const where = and(
      notDeleted(telegram_messages),
      await this.scopedUserCond(q),
    );

    const rows = await this.db
      .select({ type: telegram_messages.type, c: sql<number>`COUNT(*)` })
      .from(telegram_messages)
      .where(where)
      .groupBy(telegram_messages.type);

    const counts = new Map<number, number>();
    for (const r of rows) counts.set(r.type, Number(r.c));

    return {
      by_types: TELEGRAM_TYPE_IDS.map((id) => ({
        id,
        type: this.typeName(id, lang),
        count: counts.get(id) ?? 0,
      })),
    };
  }
}
