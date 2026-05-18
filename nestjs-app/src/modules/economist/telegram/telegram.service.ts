// Economist telegram service. Laravel: Economist/TelegramController.
//
// Telegram bot uchun endpointlar (Laravel'da `economist-bot-token` middleware bilan
// himoyalangan — biz `@Public()` qoldiramiz, lekin haqiqiy ma'lumot qaytaramiz).

import { Injectable } from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import {
  economist_telegram_users,
  workers,
  users as appUsers,
  statements,
} from '@/db/schema';

interface LoginDto {
  phone?: string;
  pin: string | number;
  chat_id: number | string;
  bot_token?: string;
}

/**
 * `buildSalaryDetail` qabul qiladigan statement shape — Drizzle infer'dan
 * olingan, `s_<code>` indexed signature qo'shilgan.
 */
type SalaryStatementShape = typeof statements.$inferSelect;

@Injectable()
export class EconomistTelegramService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * POST /api/v1/economist/telegram/login
   * Laravel parity: pin orqali worker topiladi, chat_id+worker_id juftligini
   * `economist_telegram_users`ga upsert qiladi.
   */
  async login(body: LoginDto, botToken?: string) {
    if (!body.pin || !body.chat_id) {
      throw new BusinessException(422, 'validation_failed');
    }

    // 1. Worker pin bo'yicha topish
    const [worker] = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        pin: workers.pin,
        first_name: workers.first_name,
        last_name: workers.last_name,
        middle_name: workers.middle_name,
      })
      .from(workers)
      .where(eq(workers.pin, Number(body.pin)))
      .limit(1);
    if (!worker) {
      throw new BusinessException(401, 'unauthorized');
    }

    // 2. User (agar worker_id bog'langan bo'lsa)
    const [user] = await this.db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.worker_id, worker.id))
      .limit(1);

    // 3. Telegram user qayd: existing yoki create
    const [existing] = await this.db
      .select({ id: economist_telegram_users.id })
      .from(economist_telegram_users)
      .where(
        and(
          eq(economist_telegram_users.worker_id, worker.id),
          eq(economist_telegram_users.chat_id, Number(body.chat_id)),
        ),
      )
      .limit(1);

    if (!existing) {
      await this.db.insert(economist_telegram_users).values({
        user_id: user?.id ?? null,
        worker_id: worker.id,
        chat_id: Number(body.chat_id),
        bot_token: botToken ?? body.bot_token ?? null,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
    }

    return {
      uuid: worker.uuid,
      worker: {
        id: worker.id,
        uuid: worker.uuid,
        pin: worker.pin,
        first_name: worker.first_name,
        last_name: worker.last_name,
        middle_name: worker.middle_name,
        full_name: this.buildFullName(worker),
      },
    };
  }

  /**
   * GET /api/v1/economist/telegram/check-user
   * Laravel: chat_id + bot_token bo'yicha foydalanuvchini topadi.
   */
  async checkUser(q: { chat_id?: string | number }, botToken?: string) {
    if (!q.chat_id) {
      throw new BusinessException(422, 'validation_failed');
    }

    const conds = [eq(economist_telegram_users.chat_id, Number(q.chat_id))];
    if (botToken) {
      conds.push(eq(economist_telegram_users.bot_token, botToken));
    }

    const [row] = await this.db
      .select({
        worker_id: economist_telegram_users.worker_id,
      })
      .from(economist_telegram_users)
      .where(and(...conds))
      .limit(1);

    if (!row?.worker_id) {
      throw new BusinessException(404, 'not_found');
    }

    const [worker] = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        pin: workers.pin,
        first_name: workers.first_name,
        last_name: workers.last_name,
        middle_name: workers.middle_name,
      })
      .from(workers)
      .where(eq(workers.id, row.worker_id))
      .limit(1);

    if (!worker) {
      throw new BusinessException(404, 'not_found');
    }

    return {
      user: worker.uuid,
      worker: {
        id: worker.id,
        uuid: worker.uuid,
        pin: worker.pin,
        first_name: worker.first_name,
        last_name: worker.last_name,
        middle_name: worker.middle_name,
        full_name: this.buildFullName(worker),
      },
    };
  }

  /**
   * GET /api/v1/economist/telegram/months?uuid=
   * Worker uchun mavjud (year, month) oylar ro'yxati.
   */
  async months(q: { uuid?: string }) {
    if (!q.uuid) {
      throw new BusinessException(400, 'validation_failed');
    }

    const [worker] = await this.db
      .select({ id: workers.id, pin: workers.pin })
      .from(workers)
      .where(eq(workers.uuid, q.uuid))
      .limit(1);
    if (!worker) {
      throw new BusinessException(400, 'unauthorized');
    }

    // worker_id BO'LSA shu, AKS HOLDA pin orqali
    const rows = await this.db
      .selectDistinct({
        year: statements.year,
        month: statements.month,
      })
      .from(statements)
      .where(
        or(
          eq(statements.worker_id, worker.id),
          worker.pin ? eq(statements.pin, worker.pin) : sql`FALSE`,
        ),
      )
      .orderBy(statements.year, statements.month);

    return { months: rows };
  }

  /**
   * GET /api/v1/economist/telegram/salary?uuid=&year=&month=
   * Worker uchun bitta oy ma'lumotlari (har tashkilot uchun alohida).
   */
  async salary(q: {
    uuid?: string;
    year?: string | number;
    month?: string | number;
  }) {
    if (!q.uuid || !q.month) {
      throw new BusinessException(400, 'validation_failed');
    }

    const [worker] = await this.db
      .select({ id: workers.id, pin: workers.pin })
      .from(workers)
      .where(eq(workers.uuid, q.uuid))
      .limit(1);
    if (!worker) {
      throw new BusinessException(401, 'unauthorized');
    }

    const year =
      q.year !== undefined ? Number(q.year) : new Date().getFullYear();
    const month = Number(q.month);

    const rows = await this.db
      .select()
      .from(statements)
      .where(
        and(
          or(
            eq(statements.worker_id, worker.id),
            worker.pin ? eq(statements.pin, worker.pin) : sql`FALSE`,
          ),
          eq(statements.year, year),
          eq(statements.month, month),
        ),
      );

    // Har statement uchun in/out/in_card strukturasini quramiz (Laravel parity).
    return { salary: rows.map((s) => this.buildSalaryDetail(s)) };
  }

  // ============================================================
  // YORDAMCHILAR
  // ============================================================

  private buildFullName(w: {
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
  }): string {
    return [w.last_name, w.first_name, w.middle_name].filter(Boolean).join(' ');
  }

  /**
   * Statement record'idan `{worker, in, in_total, out, out_total, in_card}` qurish.
   * Laravel `StatementDetailService::extractData` parity:
   *   - in: kodlar 001..600 (positive group — daromad)
   *   - out: kodlar 856..999 (deduction/withhold — ushlanma/saqlanma)
   *   - in_card: s_885 (maoshni kartaga to'lash)
   *
   * Service: kerakli field'lar + 200+ ta `s_<code>` numeric ustun.
   * Statement schema'sini cheklab olmaymiz (199 ta s_NNN ustun) — `Statement &
   * { [s_NNN: string]: number }` shaklida indeksli signature ishlatamiz.
   */
  private buildSalaryDetail(stmt: SalaryStatementShape) {
    const inItems: Array<{ code: string; amount: number }> = [];
    const outItems: Array<{ code: string; amount: number }> = [];
    let inTotal = 0;
    let outTotal = 0;
    let inCard = 0;

    for (const key of Object.keys(stmt)) {
      if (!key.startsWith('s_')) continue;
      // `s_<code>` ustunlari schema'da numeric — indexed type orqali xavfsiz olamiz.
      const value = Number((stmt as Record<string, unknown>)[key] ?? 0);
      if (value === 0) continue;
      const code = key.substring(2);
      const codeNum = Number(code);

      if (codeNum >= 1 && codeNum <= 600) {
        inItems.push({ code, amount: value });
        inTotal += value;
      } else if (codeNum >= 856 && codeNum <= 999) {
        outItems.push({ code, amount: value });
        outTotal += value;
      }

      if (code === '885') inCard = value;
    }

    return {
      worker: {
        full_name: stmt.full_name,
        pin: stmt.pin,
        position: stmt.position,
        main_salary: stmt.main_salary,
        work_time: stmt.work_time,
        year: stmt.year,
        month: stmt.month,
        organization_id: stmt.organization_id,
      },
      in: inItems,
      in_total: inTotal,
      out: outItems,
      out_total: outTotal,
      in_card: { code: '885', amount: inCard },
    };
  }
}
