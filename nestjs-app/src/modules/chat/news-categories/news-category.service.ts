// Chat news categories service. Laravel: ChatNewsCategoryService.

import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { chat_news_categories } from '@/db/schema';
import type {
  CategoryListQueryDto,
  UpsertCategoryDto,
} from '@/modules/chat/news-categories/dto/category.dto';

// Carbon toDateTimeString() — "Y-m-d H:i:s" (index resource).
function toDateTimeString(v: string | null): string | null {
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
  return m ? `${m[1]} ${m[2]}` : v;
}

// Eloquent default date serialization — ISO8601 "Y-m-d\TH:i:s.u\Z" (store/update raw model).
function toModelIso(v: string | null): string | null {
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
  return m ? `${m[1]}T${m[2]}.000000Z` : v;
}

@Injectable()
export class ChatNewsCategoryService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /chat/categories — paginatsiyalangan ro'yxat. */
  async list(q: CategoryListQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;
    const where = notDeleted(chat_news_categories);

    // Laravel ChatNewsCategory::paginate — orderBy YO'Q (natural order).
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(chat_news_categories)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(chat_news_categories)
        .where(where),
    ]);

    // ChatNewsCategoryResource — {id, name (array cast), created_at (Y-m-d H:i:s)}.
    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        created_at: toDateTimeString(r.created_at),
      })),
    };
  }

  // Laravel store/update — xom modelni qaytaradi (resource emas): {id, name,
  // created_at, updated_at, deleted_at}. Sana default ISO8601 serializatsiya.
  private serialize(row: typeof chat_news_categories.$inferSelect) {
    return {
      id: row.id,
      name: row.name,
      created_at: toModelIso(row.created_at),
      updated_at: toModelIso(row.updated_at),
      deleted_at: toModelIso(row.deleted_at),
    };
  }

  /**
   * POST /chat/categories — Laravel store. `name` jsonb obyekt ({uz, ru?, en?}).
   */
  async create(dto: UpsertCategoryDto) {
    const [row] = await this.db
      .insert(chat_news_categories)
      .values({
        name: dto.name,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return this.serialize(row);
  }

  /** PUT /chat/categories/:id — Laravel update. */
  async update(id: number, dto: UpsertCategoryDto) {
    const [row] = await this.db
      .update(chat_news_categories)
      .set({ name: dto.name, updated_at: sql`NOW()` })
      .where(eq(chat_news_categories.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');
    return this.serialize(row);
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
