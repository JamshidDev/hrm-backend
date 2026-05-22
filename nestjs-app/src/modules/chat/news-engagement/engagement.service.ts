// News engagement service.
// Laravel: ChatNewsViewService, ChatNewsReactionService.
//
// `addView`: idempotent — bir foydalanuvchi bir xil yangilikni 2 marta ko'rsa,
// faqat birinchi yozuv saqlanadi. `views_count` real-time inkrementlanadi.
//
// `addReaction`: upsert — agar foydalanuvchi avval reaction qilgan bo'lsa, yangilanadi.
// Like/Dislike counter'lar avtomatik moslashtiriladi.

import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { chat_news, chat_news_views, chat_news_likes } from '@/db/schema';

@Injectable()
export class ChatNewsEngagementService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * POST /news/:id/view — yangilikni ko'rilgan deb belgilash.
   * Idempotent: takroriy view yozuvi yaratilmaydi.
   */
  async addView(newsId: number) {
    const userId = this.ctx.user_or_fail.id;

    // News mavjudligini tekshirish (404 uchun)
    const [news] = await this.db
      .select({ id: chat_news.id })
      .from(chat_news)
      .where(eq(chat_news.id, newsId))
      .limit(1);
    if (!news) throw new BusinessException(404, 'not_found');

    // Allaqachon ko'rilganmi?
    const [existing] = await this.db
      .select({ id: chat_news_views.id })
      .from(chat_news_views)
      .where(
        and(
          eq(chat_news_views.chat_news_id, newsId),
          eq(chat_news_views.user_id, userId),
        ),
      )
      .limit(1);
    if (existing) return { success: true, already_viewed: true };

    return await this.db.transaction(async (tx) => {
      await tx.insert(chat_news_views).values({
        chat_news_id: newsId,
        user_id: userId,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
      // views_count inkrementlash
      await tx
        .update(chat_news)
        .set({ views_count: sql`${chat_news.views_count} + 1` })
        .where(eq(chat_news.id, newsId));
      return { success: true, already_viewed: false };
    });
  }

  /**
   * POST /news/:id/reaction — like/dislike.
   * Logika:
   *   - Mavjud reaction = yangi reaction → hech narsa o'zgarmaydi
   *   - Mavjud yo'q → yangi yozuv + counter +1
   *   - Mavjud != yangi → yangilash + eski counter -1 + yangi counter +1
   *   - reaction=0 → yozuvni o'chirish + counter -1
   */
  async addReaction(newsId: number, reaction: number) {
    const userId = this.ctx.user_or_fail.id;

    const [news] = await this.db
      .select({
        id: chat_news.id,
        likes_count: chat_news.likes_count,
        dislikes_count: chat_news.dislikes_count,
      })
      .from(chat_news)
      .where(eq(chat_news.id, newsId))
      .limit(1);
    if (!news) throw new BusinessException(404, 'not_found');

    const [existing] = await this.db
      .select({
        id: chat_news_likes.id,
        reaction: chat_news_likes.reaction,
      })
      .from(chat_news_likes)
      .where(
        and(
          eq(chat_news_likes.chat_news_id, newsId),
          eq(chat_news_likes.user_id, userId),
        ),
      )
      .limit(1);

    const oldReaction = existing?.reaction ?? 0;
    if (oldReaction === reaction) {
      return { success: true, no_change: true };
    }

    return await this.db.transaction(async (tx) => {
      // 1. Eski reaction'ni decrementlash
      if (oldReaction === 1) {
        await tx
          .update(chat_news)
          .set({ likes_count: sql`GREATEST(${chat_news.likes_count} - 1, 0)` })
          .where(eq(chat_news.id, newsId));
      } else if (oldReaction === -1) {
        await tx
          .update(chat_news)
          .set({
            dislikes_count: sql`GREATEST(${chat_news.dislikes_count} - 1, 0)`,
          })
          .where(eq(chat_news.id, newsId));
      }

      // 2. Yangi reaction'ni saqlash
      if (existing) {
        if (reaction === 0) {
          // O'chirish (neutralga qaytarish)
          await tx
            .delete(chat_news_likes)
            .where(eq(chat_news_likes.id, existing.id));
        } else {
          await tx
            .update(chat_news_likes)
            .set({ reaction, updated_at: sql`NOW()` })
            .where(eq(chat_news_likes.id, existing.id));
        }
      } else if (reaction !== 0) {
        await tx.insert(chat_news_likes).values({
          chat_news_id: newsId,
          user_id: userId,
          reaction,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }

      // 3. Yangi counter
      if (reaction === 1) {
        await tx
          .update(chat_news)
          .set({ likes_count: sql`${chat_news.likes_count} + 1` })
          .where(eq(chat_news.id, newsId));
      } else if (reaction === -1) {
        await tx
          .update(chat_news)
          .set({ dislikes_count: sql`${chat_news.dislikes_count} + 1` })
          .where(eq(chat_news.id, newsId));
      }

      return { success: true, reaction };
    });
  }
}
