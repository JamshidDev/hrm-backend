// Chat news translations service. Laravel: ChatNewsTranslationService.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { chat_news_translations } from '@/db/schema';
import type {
  TranslationListQueryDto,
  UpsertTranslationDto,
} from '@/modules/chat/news-translations/dto/translation.dto';

@Injectable()
export class ChatNewsTranslationService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: TranslationListQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;

    const conds: SQL[] = [notDeleted(chat_news_translations)];
    if (q.chat_news_id !== undefined) {
      conds.push(eq(chat_news_translations.chat_news_id, q.chat_news_id));
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(chat_news_translations)
        .where(where)
        .orderBy(desc(chat_news_translations.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(chat_news_translations)
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(chat_news_translations)
      .where(eq(chat_news_translations.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  /**
   * POST /chat/translations — locale bo'yicha upsert.
   * Agar shu news + locale juftligi mavjud bo'lsa, yangilaymiz; aks holda yangi qator.
   */
  async create(dto: UpsertTranslationDto) {
    const [existing] = await this.db
      .select({ id: chat_news_translations.id })
      .from(chat_news_translations)
      .where(
        and(
          eq(chat_news_translations.chat_news_id, dto.chat_news_id),
          eq(chat_news_translations.locale, dto.locale),
        ),
      )
      .limit(1);

    if (existing) {
      const [row] = await this.db
        .update(chat_news_translations)
        .set({
          title: dto.title ?? null,
          short_description: dto.short_description ?? null,
          content: dto.content ?? null,
          updated_at: sql`NOW()`,
        })
        .where(eq(chat_news_translations.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await this.db
      .insert(chat_news_translations)
      .values({
        chat_news_id: dto.chat_news_id,
        locale: dto.locale,
        title: dto.title ?? null,
        short_description: dto.short_description ?? null,
        content: dto.content ?? null,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return row;
  }

  async update(id: number, dto: UpsertTranslationDto) {
    const [row] = await this.db
      .update(chat_news_translations)
      .set({
        chat_news_id: dto.chat_news_id,
        locale: dto.locale,
        title: dto.title ?? null,
        short_description: dto.short_description ?? null,
        content: dto.content ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(chat_news_translations.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  async remove(id: number) {
    const [row] = await this.db
      .update(chat_news_translations)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(chat_news_translations.id, id))
      .returning({ id: chat_news_translations.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }
}
