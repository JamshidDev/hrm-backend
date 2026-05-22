// Chat user emoji service. Laravel: UserEmojiController::send.
//
// Socket server'dan kelgan emoji burst'larni batch insert qiladi.
// Har item: {fromUserId, toUserId, emoji, ts(ms timestamp)}.
// Timestamp Asia/Tashkent timezone'da Date'ga aylantiriladi.

import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { chat_user_emoji } from '@/db/schema';
import type { SendEmojiBatchDto } from '@/modules/chat/user-emoji/dto/emoji.dto';

@Injectable()
export class ChatUserEmojiService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /**
   * Emoji batch insert.
   * Laravel parity: timestamp millisekunddan Date'ga aylantirilib `created_at`/`updated_at`'ga.
   */
  async send(dto: SendEmojiBatchDto) {
    const rows = dto.items.map((item) => {
      const dt = new Date(item.ts).toISOString();
      return {
        from_user_id: item.fromUserId,
        to_user_id: item.toUserId,
        text: item.emoji,
        created_at: dt,
        updated_at: dt,
      };
    });

    // 500 chunk'larda — juda katta emoji burst uchun.
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.db.insert(chat_user_emoji).values(rows.slice(i, i + CHUNK));
      inserted += Math.min(CHUNK, rows.length - i);
    }
    return { ok: true, inserted };
  }

  /** Statistika — Drizzle reference uchun (telegram dashboard'ga o'xshash, hozircha unused). */
  async stats() {
    const [{ total }] = await this.db
      .select({ total: sql<number>`COUNT(*)` })
      .from(chat_user_emoji);
    return { total: Number(total) };
  }
}
