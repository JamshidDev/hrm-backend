// Chat telegram service. Laravel: TelegramController.
//
// `telegram_messages` jadvali — backend bot orqali yuborgan xabarlar tarixi.
// Laravel'da WorkerPosition filtri orqali user scoping qilingan, biz hozircha
// soddalashtirilgan variantni qaytaramiz (organization_id filter ixtiyoriy).

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  telegram_messages,
  users,
  workers,
  worker_positions,
} from '@/db/schema';
import type { TelegramMessagesQueryDto } from '@/modules/chat/telegram/dto/telegram.dto';

/** Laravel `TelegramMessageTypeEnum`. */
const TELEGRAM_TYPES = [
  { id: 1, type: 'General' },
  { id: 2, type: 'Notification' },
  { id: 3, type: 'System' },
];

@Injectable()
export class ChatTelegramService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * GET /telegram/messages — backend bot xabarlari tarixi.
   * User + worker bilan join (Laravel `whereHas('user', whereIn worker_id)`).
   */
  async messages(q: TelegramMessagesQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;

    let where: SQL = notDeleted(telegram_messages);

    // Organization_id berilgan bo'lsa — WorkerPosition orqali user'larni filter
    if (q.organization_id !== undefined) {
      const userIds = await this.db
        .selectDistinct({ user_id: users.id })
        .from(worker_positions)
        .innerJoin(workers, eq(workers.id, worker_positions.worker_id))
        .innerJoin(users, eq(users.worker_id, workers.id))
        .where(eq(worker_positions.organization_id, q.organization_id));

      const ids = userIds.map((u) => u.user_id);
      if (!ids.length) {
        return { current_page: page, per_page: perPage, total: 0, data: [] };
      }
      where = and(
        where,
        sql`${telegram_messages.user_id} = ANY(ARRAY[${sql.raw(ids.join(','))}]::bigint[])`,
      )!;
    }

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

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /**
   * GET /telegram/dashboard — type bo'yicha xabarlar soni.
   * Laravel: GROUP BY type COUNT(*) — barcha turlar uchun, 0 ham ko'rsatiladi.
   */
  async dashboard() {
    const rows = await this.db
      .select({
        type: telegram_messages.type,
        count: sql<number>`COUNT(*)`,
      })
      .from(telegram_messages)
      .where(notDeleted(telegram_messages))
      .groupBy(telegram_messages.type);

    const countsByType = new Map<number, number>();
    for (const r of rows) countsByType.set(r.type, Number(r.count));

    return {
      by_types: TELEGRAM_TYPES.map((t) => ({
        id: t.id,
        type: t.type,
        count: countsByType.get(t.id) ?? 0,
      })),
    };
  }
}
