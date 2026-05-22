// Telegram bot service. Laravel: TelegramController (bot endpointlari).
// 9 endpoint, telegram middleware bilan himoyalangan.
// Laravel middleware bot tokenni tekshiradi — NestJS hozircha Public stub.

import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { user_telegrams, users, workers } from '@/db/schema';
import type {
  TelegramCheckDto,
  TelegramRegisterDto,
  TelegramServiceQueryDto,
  TelegramSetServiceDto,
} from '@/modules/telegram-bot/dto/telegram-bot.dto';

@Injectable()
export class TelegramBotService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * POST /telegram/auth/check — phone + pin orqali workerni tekshirish.
   * Laravel: TelegramService.check.
   */
  async check(dto: TelegramCheckDto) {
    const phoneNum = Number(dto.phone);
    if (!Number.isFinite(phoneNum)) return { found: false };

    const [u] = await this.db
      .select({ id: users.id, worker_id: users.worker_id })
      .from(users)
      .where(eq(users.phone, phoneNum))
      .limit(1);
    if (!u || !u.worker_id) return { found: false };

    const [w] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.id, u.worker_id))
      .limit(1);
    if (!w) return { found: false };

    // PIN tekshirish — workers.pin (bigint)
    const pinNum = Number(dto.pin);
    if (!Number.isFinite(pinNum) || w.pin !== pinNum) return { found: false };

    return {
      found: true,
      uuid: w.uuid,
      worker: {
        id: w.id,
        last_name: w.last_name,
        first_name: w.first_name,
        middle_name: w.middle_name,
        phone: u.id,
      },
    };
  }

  /**
   * POST /telegram/auth/register — uuid + chat_id ni user_telegrams'ga yozish.
   */
  async register(dto: TelegramRegisterDto) {
    // worker.uuid orqali user'ni topish
    const [w] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(eq(workers.uuid, dto.uuid))
      .limit(1);
    if (!w) throw new BusinessException(404, 'not_found');

    const [u] = await this.db
      .select({ id: users.id, phone: users.phone })
      .from(users)
      .where(eq(users.worker_id, w.id))
      .limit(1);
    if (!u) throw new BusinessException(404, 'not_found');

    // user_telegrams ga insert (yoki update active=true)
    const existing = await this.db
      .select({ id: user_telegrams.id })
      .from(user_telegrams)
      .where(eq(user_telegrams.chat_id, dto.chat_id))
      .limit(1);

    if (existing.length) {
      await this.db
        .update(user_telegrams)
        .set({ active: true, user_id: u.id, updated_at: sql`NOW()` })
        .where(eq(user_telegrams.chat_id, dto.chat_id));
    } else {
      await this.db.insert(user_telegrams).values({
        user_id: u.id,
        phone: u.phone,
        chat_id: dto.chat_id,
        active: true,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
    }
    return { success: true };
  }

  /**
   * DELETE /telegram/auth/:chatId — soft-deactivate.
   */
  async deactivate(chatId: number) {
    await this.db
      .update(user_telegrams)
      .set({ active: false, updated_at: sql`NOW()` })
      .where(eq(user_telegrams.chat_id, chatId));
    return { success: true };
  }

  /** GET /telegram/auth/:chatId — user info by chat_id. */
  async userInfoByChatId(chatId: number) {
    const [link] = await this.db
      .select()
      .from(user_telegrams)
      .where(eq(user_telegrams.chat_id, chatId))
      .limit(1);
    if (!link) return null;

    const [u] = await this.db
      .select({ id: users.id, worker_id: users.worker_id, phone: users.phone })
      .from(users)
      .where(eq(users.id, link.user_id))
      .limit(1);
    if (!u) return null;

    let worker: {
      id: number;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      photo: string | null;
    } | null = null;
    if (u.worker_id) {
      const [w] = await this.db
        .select({
          id: workers.id,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          photo: workers.photo,
        })
        .from(workers)
        .where(eq(workers.id, u.worker_id))
        .limit(1);
      worker = w ?? null;
    }
    return {
      chat_id: link.chat_id,
      active: link.active,
      user: { id: u.id, phone: u.phone, worker },
    };
  }

  /** GET /telegram/profile — joriy user profile (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async profile() {
    return { worker: null, stub: true };
  }

  /** GET /telegram/petition-types — petitsiya turlari (stub). */
  petitionTypes() {
    return [
      { id: 1, name: 'Ariza' },
      { id: 2, name: 'Hujjat' },
    ];
  }

  /** GET /telegram/menu/services — mavjud servislar ro'yxati (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async listServices() {
    return [
      { id: 1, hash: 'stub-hash-1', name: 'Salary months' },
      { id: 2, hash: 'stub-hash-2', name: 'HCP devices' },
    ];
  }

  /** GET /telegram/menu/get-service?service=<md5> — bitta servis tafsiloti (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getService(_q: TelegramServiceQueryDto) {
    return { data: null, stub: true };
  }

  /** POST /telegram/menu/set-service — service ni saqlash (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async setService(_dto: TelegramSetServiceDto) {
    return { success: true, stub: true };
  }
}
