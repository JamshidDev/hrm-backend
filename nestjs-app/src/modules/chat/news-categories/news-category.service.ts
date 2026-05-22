// Chat news categories service. Laravel: ChatNewsCategoryService.

import { Injectable } from '@nestjs/common';
import { count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { chat_news_categories } from '@/db/schema';
import type {
  CategoryListQueryDto,
  UpsertCategoryDto,
} from '@/modules/chat/news-categories/dto/category.dto';

@Injectable()
export class ChatNewsCategoryService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /chat/categories — paginatsiyalangan ro'yxat. */
  async list(q: CategoryListQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;
    const where = notDeleted(chat_news_categories);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(chat_news_categories)
        .where(where)
        .orderBy(desc(chat_news_categories.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(chat_news_categories)
        .where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /**
   * POST /chat/categories — yangi kategoriya yaratish.
   * `name` jsonb ustuni — 3 til uchun {uz, ru, en} shaklida saqlanadi.
   */
  async create(dto: UpsertCategoryDto) {
    const name = {
      uz: dto.name,
      ru: dto.name_ru ?? dto.name,
      en: dto.name_en ?? dto.name,
    };
    const [row] = await this.db
      .insert(chat_news_categories)
      .values({
        name,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return row;
  }

  /** PUT /chat/categories/:id — yangilash. */
  async update(id: number, dto: UpsertCategoryDto) {
    const name = {
      uz: dto.name,
      ru: dto.name_ru ?? dto.name,
      en: dto.name_en ?? dto.name,
    };
    const [row] = await this.db
      .update(chat_news_categories)
      .set({ name, updated_at: sql`NOW()` })
      .where(eq(chat_news_categories.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  /** DELETE /chat/categories/:id — soft-delete. */
  async remove(id: number) {
    const [row] = await this.db
      .update(chat_news_categories)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(chat_news_categories.id, id))
      .returning({ id: chat_news_categories.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }
}
