// Admin Telegram service. Laravel: TelegramController + TelegramPushController.
// 4 endpoint: index (accounts), sendMessage (broadcast), telegramUsers (paginated), detachUsers.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { user_telegrams, users, workers } from '@/db/schema';
import type {
  TelegramAccountsQueryDto,
  TelegramDetachDto,
  TelegramUsersQueryDto,
} from '@/modules/admin/telegram/dto/telegram.dto';

interface WorkerBrief {
  id: number;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  photo: string | null;
}

@Injectable()
export class AdminTelegramService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
  ) {}

  /**
   * GET /admin/telegram/users — Laravel paginateAccounts → UserTelegramAccountsResource.
   * Filter: search (worker fullname OR phone OR chat_id LIKE).
   */
  async listAccounts(q: TelegramAccountsQueryDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 10)));
    const offset = (page - 1) * perPage;

    const conds: SQL[] = [notDeleted(user_telegrams)];
    if (q.search) {
      const pattern = `%${q.search}%`;
      const workerCond = buildWorkerSearchCond(q.search);
      // whereHas('user', worker searchByFullName) OR phone OR chat_id.
      const workerExists = workerCond
        ? sql`EXISTS (SELECT 1 FROM ${users} su JOIN ${workers} ON ${workers.id} = su.worker_id WHERE su.id = ${user_telegrams.user_id} AND ${workerCond})`
        : undefined;
      const orExpr = or(
        ...(workerExists ? [workerExists] : []),
        sql`CAST(${user_telegrams.phone} AS TEXT) ILIKE ${pattern}`,
        sql`CAST(${user_telegrams.chat_id} AS TEXT) ILIKE ${pattern}`,
      );
      if (orExpr) conds.push(orExpr);
    }
    const where = and(...conds) ?? notDeleted(user_telegrams);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(user_telegrams)
        .where(where)
        .orderBy(desc(user_telegrams.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(user_telegrams).where(where),
    ]);

    // user (UserInfoResource: id, uuid, worker(WorkerMinimal), phone) batch.
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const userRows = userIds.length
      ? await this.db
          .select({
            id: users.id,
            uuid: users.uuid,
            phone: users.phone,
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

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const u = userMap.get(r.user_id);
          const user = u
            ? {
                id: u.id,
                uuid: u.uuid,
                worker: u.w_id
                  ? {
                      id: u.w_id,
                      photo: await this.minio.fileUrl(u.w_photo),
                      last_name: u.w_last,
                      first_name: u.w_first,
                      middle_name: u.w_middle,
                    }
                  : null,
                phone: u.phone,
              }
            : null;
          return {
            id: r.id,
            phone: r.phone,
            user,
            chat_id: r.chat_id,
            // user_telegrams'da `tg_id` ustuni yo'q → Laravel $this->tg_id = null (parity).
            tg_id: null,
            created_at: r.created_at,
          };
        }),
      ),
    };
  }

  /**
   * POST /admin/telegram/users/send-message — Laravel: broadcast (queued job).
   * Stub: queue real implementation keyin.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async sendMessage() {
    return { success: true, stub: true, message: 'Mass push queued (stub)' };
  }

  /**
   * GET /admin/telegram/bot/users — paginateUsers, with birthdays filter.
   * Laravel: birthdays=true → only users with today's birthday.
   */
  async listBotUsers(q: TelegramUsersQueryDto) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(q?.per_page ?? 20)));
    const offset = (page - 1) * perPage;

    // birthdays filter user_telegrams → users → workers chain orqali.
    let workerIdsForBirthday: number[] | null = null;
    if (q.birthdays) {
      const todayRows = await this.db
        .select({ id: workers.id })
        .from(workers)
        .where(
          sql`to_char(${workers.birthday}, 'MM-DD') = to_char(CURRENT_DATE, 'MM-DD')`,
        );
      workerIdsForBirthday = todayRows.map((r) => r.id);
      if (!workerIdsForBirthday.length) {
        return { current_page: page, per_page: perPage, total: 0, data: [] };
      }
    }

    const conds: SQL[] = [
      notDeleted(user_telegrams),
      eq(user_telegrams.active, true),
    ];

    if (workerIdsForBirthday) {
      const userIds = await this.db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.worker_id, workerIdsForBirthday));
      const ids = userIds.map((u) => u.id);
      if (!ids.length) {
        return { current_page: page, per_page: perPage, total: 0, data: [] };
      }
      conds.push(inArray(user_telegrams.user_id, ids));
    }
    const where = and(...conds) ?? notDeleted(user_telegrams);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(user_telegrams)
        .where(where)
        .orderBy(desc(user_telegrams.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(user_telegrams).where(where),
    ]);

    const data = await this.enrichWithUserWorker(rows);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data,
    };
  }

  /** POST /admin/telegram/bot/users-detach — soft-deactivate by chat_ids. */
  async detachUsers(dto: TelegramDetachDto) {
    await this.db
      .update(user_telegrams)
      .set({ active: false, updated_at: sql`NOW()` })
      .where(inArray(user_telegrams.chat_id, dto.chat_ids));
    return { success: true, detached: dto.chat_ids.length };
  }

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  private async enrichWithUserWorker(
    rows: Array<typeof user_telegrams.$inferSelect>,
  ) {
    if (!rows.length) return [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const userRows = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        worker_id: users.worker_id,
      })
      .from(users)
      .where(inArray(users.id, userIds));
    const workerIds = userRows
      .map((u) => u.worker_id)
      .filter((x): x is number => x != null);
    const workerRows: WorkerBrief[] = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const workerMap: Record<number, WorkerBrief> = {};
    for (const w of workerRows) workerMap[w.id] = w;
    const userMap: Record<number, (typeof userRows)[number]> = {};
    for (const u of userRows) userMap[u.id] = u;

    return rows.map((r) => {
      const u = userMap[r.user_id];
      const w = u?.worker_id != null ? workerMap[u.worker_id] : undefined;
      return {
        id: r.id,
        user_id: r.user_id,
        phone: r.phone,
        chat_id: r.chat_id,
        active: r.active,
        user: u
          ? {
              id: u.id,
              phone: u.phone,
              worker: w
                ? {
                    id: w.id,
                    last_name: w.last_name,
                    first_name: w.first_name,
                    middle_name: w.middle_name,
                    photo: w.photo,
                  }
                : null,
            }
          : null,
      };
    });
  }
}
