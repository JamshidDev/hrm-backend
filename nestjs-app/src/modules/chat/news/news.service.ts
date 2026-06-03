// Chat news service. Laravel: ChatNewsService.
//
// CRUD + translations + categories pivot + public listing (status=Published bilan).
// Laravel parity: store() transaction ichida news + translations + media + categories sync.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import {
  chat_news,
  chat_news_translations,
  chat_news_media,
  chat_categories_news,
  chat_news_categories,
  chat_news_views,
  chat_news_likes,
} from '@/db/schema';
import type {
  CreateNewsDto,
  NewsListQueryDto,
  PublicNewsListQueryDto,
  UpdateNewsDto,
} from '@/modules/chat/news/dto/news.dto';

// Carbon toDateTimeString() — "Y-m-d H:i:s" (fraksiya/ISO 'T' tashlanadi).
function toDateTimeString(v: string | null): string | null {
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(v);
  return m ? `${m[1]} ${m[2]}` : v;
}

// Laravel boolean validation — "1"/"true"/1/true → true.
function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

// FormData bracket-notation (a[0][b]=c) → nested obyekt/massiv. JSON body o'zgarmaydi.
function unflattenForm(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const fullKey of Object.keys(flat)) {
    if (!fullKey.includes('[')) {
      result[fullKey] = flat[fullKey];
      continue;
    }
    const path = fullKey.replace(/\]/g, '').split('[');
    let cur: Record<string, unknown> | unknown[] = result;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      const last = i === path.length - 1;
      if (last) {
        (cur as Record<string, unknown>)[key] = flat[fullKey];
      } else {
        const next = path[i + 1];
        const container = (cur as Record<string, unknown>)[key];
        if (container == null) {
          (cur as Record<string, unknown>)[key] = /^\d+$/.test(next) ? [] : {};
        }
        cur = (cur as Record<string, unknown>)[key] as
          | Record<string, unknown>
          | unknown[];
      }
    }
  }
  return result;
}

@Injectable()
export class ChatNewsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  /**
   * PUT /chat/news/:id (multipart, _method=PUT spoofing) — Laravel update.
   * Frontend FormData yuboradi (media fayllari uchun). method-override multipart
   * body'ni o'qiy olmaydi, shuning uchun controller POST(:id)'ni alias qiladi.
   * Bracket-notation (translations[0][locale], media[0][file]) → nested struktura.
   */
  async updateFromForm(
    id: number,
    rawBody: Record<string, unknown>,
    files: Express.Multer.File[],
  ): Promise<void> {
    const body = unflattenForm(rawBody);
    // _method spoofing maydoni — e'tiborsiz.
    delete body._method;

    await this.db.transaction(async (tx) => {
      // 1. Scalar maydonlar (faqat berilganlar).
      const set: Record<string, unknown> = { updated_at: sql`NOW()` };
      if ('slug' in body) set.slug = String(body.slug);
      if ('status' in body) set.status = Number(body.status);
      if ('published_at' in body) set.published_at = body.published_at;
      if ('is_pinned' in body) set.is_pinned = toBool(body.is_pinned);

      const [news] = await tx
        .update(chat_news)
        .set(set)
        .where(eq(chat_news.id, id))
        .returning();
      if (!news) throw new BusinessException(404, 'not_found');

      // 2. Translations upsert per locale.
      const translations = Array.isArray(body.translations)
        ? (body.translations as Record<string, string>[])
        : [];
      for (const t of translations) {
        if (!t?.locale) continue;
        const [existing] = await tx
          .select({ id: chat_news_translations.id })
          .from(chat_news_translations)
          .where(
            and(
              eq(chat_news_translations.chat_news_id, id),
              eq(chat_news_translations.locale, t.locale),
            ),
          )
          .limit(1);
        const vals = {
          title: t.title ?? null,
          short_description: t.short_description ?? null,
          content: t.content ?? null,
        };
        if (existing) {
          await tx
            .update(chat_news_translations)
            .set({ ...vals, updated_at: sql`NOW()` })
            .where(eq(chat_news_translations.id, existing.id));
        } else {
          await tx.insert(chat_news_translations).values({
            chat_news_id: id,
            locale: t.locale,
            ...vals,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          });
        }
      }

      // 3. Categories sync (berilgan bo'lsa).
      if ('categories' in body) {
        const catIds = (Array.isArray(body.categories) ? body.categories : [])
          .map((c) => Number(c))
          .filter((n) => Number.isFinite(n));
        await tx
          .delete(chat_categories_news)
          .where(eq(chat_categories_news.chat_news_id, id));
        if (catIds.length) {
          await tx.insert(chat_categories_news).values(
            catIds.map((catId) => ({
              chat_news_id: id,
              chat_news_category_id: catId,
            })),
          );
        }
      }

      // 4. Media — Laravel: data['media'] bo'lsa eskilarni o'chirib qayta yaratadi.
      const mediaMeta = Array.isArray(body.media)
        ? (body.media as Record<string, unknown>[])
        : [];
      if (files.length) {
        await tx
          .update(chat_news_media)
          .set({ deleted_at: sql`NOW()` })
          .where(eq(chat_news_media.chat_news_id, id));
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const meta = mediaMeta[i] ?? {};
          const path = await this.minio.uploadFormFile(f, 'chat-media', [
            'pdf',
            'doc',
            'docx',
            'png',
            'jpg',
            'jpeg',
          ]);
          await tx.insert(chat_news_media).values({
            chat_news_id: id,
            type: String(meta.type ?? 'image'),
            path,
            extension:
              (f.originalname.split('.').pop() ?? '').toLowerCase() || null,
            size: f.size,
            order: meta.order != null ? Number(meta.order) : i + 1,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          });
        }
      }
    });
  }

  // ChatNewsTranslationsResource.
  private mapTranslation(t: typeof chat_news_translations.$inferSelect) {
    return {
      id: t.id,
      locale: t.locale,
      title: t.title,
      short_description: t.short_description,
      content: t.content,
    };
  }

  // ChatNewsMediaResource — path => fileUrl.
  private async mapMedia(m: typeof chat_news_media.$inferSelect) {
    return {
      id: m.id,
      type: m.type,
      path: await this.minio.fileUrl(m.path),
      size: m.size,
      extension: m.extension,
      order: m.order,
    };
  }

  // ChatNewsCategoryResource.
  private mapCategory(c: typeof chat_news_categories.$inferSelect) {
    return {
      id: c.id,
      name: c.name,
      created_at: toDateTimeString(c.created_at),
    };
  }

  // ChatNewsResource — to'liq news shape (categories/translations/media nested).
  private async mapNews(
    r: typeof chat_news.$inferSelect,
    translations: (typeof chat_news_translations.$inferSelect)[],
    media: (typeof chat_news_media.$inferSelect)[],
    categories: (typeof chat_news_categories.$inferSelect)[],
  ) {
    return {
      id: r.id,
      categories: categories.map((c) => this.mapCategory(c)),
      created_at: toDateTimeString(r.created_at),
      slug: r.slug,
      status: r.status,
      published_at: r.published_at,
      is_pinned: r.is_pinned,
      views_count: r.views_count,
      likes_count: r.likes_count,
      dislikes_count: r.dislikes_count,
      comments_count: r.comments_count,
      translations: translations.map((t) => this.mapTranslation(t)),
      media: await Promise.all(media.map((m) => this.mapMedia(m))),
    };
  }

  /** GET /chat/news — admin paginatsiya (status filtri bilan). */
  async list(q: NewsListQueryDto) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    const offset = (page - 1) * perPage;

    const conds = [notDeleted(chat_news)];
    if (q.status !== undefined) conds.push(eq(chat_news.status, q.status));
    const where = and(...conds);

    // Laravel index — orderBy YO'Q (natural order), with('categories') + lazy translations/media.
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(chat_news)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chat_news).where(where),
    ]);

    // Batch joinlar — N+1 oldini olish. Bo'sh array tipini TypeScript
    // to'g'ri inferlash uchun real Drizzle return tipini foydalanamiz.
    const newsIds = rows.map((r) => r.id);
    type TranslationRow = typeof chat_news_translations.$inferSelect;
    type MediaRow = typeof chat_news_media.$inferSelect;
    type CatLinkRow = typeof chat_categories_news.$inferSelect;
    const [translations, media, categoryLinks]: [
      TranslationRow[],
      MediaRow[],
      CatLinkRow[],
    ] = await Promise.all([
      newsIds.length
        ? this.db
            .select()
            .from(chat_news_translations)
            .where(inArray(chat_news_translations.chat_news_id, newsIds))
        : Promise.resolve([] as TranslationRow[]),
      newsIds.length
        ? this.db
            .select()
            .from(chat_news_media)
            .where(inArray(chat_news_media.chat_news_id, newsIds))
        : Promise.resolve([] as MediaRow[]),
      newsIds.length
        ? this.db
            .select()
            .from(chat_categories_news)
            .where(inArray(chat_categories_news.chat_news_id, newsIds))
        : Promise.resolve([] as CatLinkRow[]),
    ]);

    const categoryIds = [
      ...new Set(categoryLinks.map((l) => l.chat_news_category_id)),
    ];
    const categories = categoryIds.length
      ? await this.db
          .select()
          .from(chat_news_categories)
          .where(inArray(chat_news_categories.id, categoryIds))
      : [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map((r) =>
          this.mapNews(
            r,
            translations.filter((t) => t.chat_news_id === r.id),
            media.filter((m) => m.chat_news_id === r.id),
            categoryLinks
              .filter((l) => l.chat_news_id === r.id)
              .map((l) => catMap.get(l.chat_news_category_id))
              .filter((c): c is typeof chat_news_categories.$inferSelect =>
                Boolean(c),
              ),
          ),
        ),
      ),
    };
  }

  /** GET /chat/news/:id — Laravel show: ChatNews::with('categories')->findOrFail → ChatNewsResource. */
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(chat_news)
      .where(and(eq(chat_news.id, id), notDeleted(chat_news)))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const [translations, media, categoryLinks] = await Promise.all([
      this.db
        .select()
        .from(chat_news_translations)
        .where(eq(chat_news_translations.chat_news_id, id)),
      this.db
        .select()
        .from(chat_news_media)
        .where(eq(chat_news_media.chat_news_id, id)),
      this.db
        .select()
        .from(chat_categories_news)
        .where(eq(chat_categories_news.chat_news_id, id)),
    ]);

    const categoryIds = categoryLinks.map((l) => l.chat_news_category_id);
    const categories = categoryIds.length
      ? await this.db
          .select()
          .from(chat_news_categories)
          .where(inArray(chat_news_categories.id, categoryIds))
      : [];

    return this.mapNews(row, translations, media, categories);
  }

  /**
   * POST /chat/news — transaction ichida news + translations + categories pivot.
   * Media file upload alohida endpoint orqali (news-media).
   */
  async create(dto: CreateNewsDto) {
    const userOrgId = this.ctx.user?.organization_id ?? null;

    return await this.db.transaction(async (tx) => {
      const [news] = await tx
        .insert(chat_news)
        .values({
          organization_id: userOrgId,
          slug: dto.slug ?? '',
          status: dto.status,
          published_at: dto.published_at ?? null,
          is_pinned: dto.is_pinned ?? false,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .returning();

      // Translations
      if (dto.translations?.length) {
        await tx.insert(chat_news_translations).values(
          dto.translations.map((t) => ({
            chat_news_id: news.id,
            locale: t.locale,
            title: t.title ?? null,
            short_description: t.short_description ?? null,
            content: t.content ?? null,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })),
        );
      }

      // Categories pivot
      if (dto.categories?.length) {
        await tx.insert(chat_categories_news).values(
          dto.categories.map((catId) => ({
            chat_news_id: news.id,
            chat_news_category_id: catId,
          })),
        );
      }

      return news;
    });
  }

  /**
   * PUT /chat/news/:id — Laravel parity: translations updateOrCreate per locale,
   * media qayta yozish, categories sync.
   */
  async update(id: number, dto: UpdateNewsDto) {
    return await this.db.transaction(async (tx) => {
      // 1. News yozuvi
      const updateData: Record<string, unknown> = { updated_at: sql`NOW()` };
      if (dto.slug !== undefined) updateData.slug = dto.slug;
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.published_at !== undefined)
        updateData.published_at = dto.published_at;
      if (dto.is_pinned !== undefined) updateData.is_pinned = dto.is_pinned;

      const [news] = await tx
        .update(chat_news)
        .set(updateData)
        .where(eq(chat_news.id, id))
        .returning();
      if (!news) throw new BusinessException(404, 'not_found');

      // 2. Translations upsert per locale
      if (dto.translations?.length) {
        for (const t of dto.translations) {
          const [existing] = await tx
            .select({ id: chat_news_translations.id })
            .from(chat_news_translations)
            .where(
              and(
                eq(chat_news_translations.chat_news_id, id),
                eq(chat_news_translations.locale, t.locale),
              ),
            )
            .limit(1);

          if (existing) {
            await tx
              .update(chat_news_translations)
              .set({
                title: t.title ?? null,
                short_description: t.short_description ?? null,
                content: t.content ?? null,
                updated_at: sql`NOW()`,
              })
              .where(eq(chat_news_translations.id, existing.id));
          } else {
            await tx.insert(chat_news_translations).values({
              chat_news_id: id,
              locale: t.locale,
              title: t.title ?? null,
              short_description: t.short_description ?? null,
              content: t.content ?? null,
              created_at: sql`NOW()`,
              updated_at: sql`NOW()`,
            });
          }
        }
      }

      // 3. Categories sync (Laravel `categories()->sync(...)` ekvivalenti)
      if (dto.categories !== undefined) {
        await tx
          .delete(chat_categories_news)
          .where(eq(chat_categories_news.chat_news_id, id));
        if (dto.categories.length) {
          await tx.insert(chat_categories_news).values(
            dto.categories.map((catId) => ({
              chat_news_id: id,
              chat_news_category_id: catId,
            })),
          );
        }
      }

      return news;
    });
  }

  /** DELETE /chat/news/:id — soft-delete. */
  async remove(id: number) {
    const [row] = await this.db
      .update(chat_news)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(chat_news.id, id))
      .returning({ id: chat_news.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }

  /**
   * GET /news (public, auth-hybrid) — Laravel `ChatNewsService::list`.
   * status=2 (Published) qatorlar + per-user `is_viewed`/`has_liked`/`has_disliked`.
   */
  async publicList(q: PublicNewsListQueryDto) {
    const userId = this.ctx.user?.id ?? null;
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 5);
    const offset = (page - 1) * perPage;

    const where = and(eq(chat_news.status, 2), notDeleted(chat_news));

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(chat_news)
        .where(where)
        .orderBy(desc(chat_news.published_at))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(chat_news).where(where),
    ]);

    const newsIds = rows.map((r) => r.id);
    if (!newsIds.length) {
      return {
        current_page: page,
        per_page: perPage,
        total: Number(total),
        data: [],
      };
    }

    const [translations, media, categoryLinks, userViews, userLikes] =
      await Promise.all([
        this.db
          .select()
          .from(chat_news_translations)
          .where(inArray(chat_news_translations.chat_news_id, newsIds)),
        this.db
          .select()
          .from(chat_news_media)
          .where(inArray(chat_news_media.chat_news_id, newsIds)),
        this.db
          .select()
          .from(chat_categories_news)
          .where(inArray(chat_categories_news.chat_news_id, newsIds)),
        userId
          ? this.db
              .select({ chat_news_id: chat_news_views.chat_news_id })
              .from(chat_news_views)
              .where(
                and(
                  inArray(chat_news_views.chat_news_id, newsIds),
                  eq(chat_news_views.user_id, userId),
                ),
              )
          : Promise.resolve([] as { chat_news_id: number }[]),
        userId
          ? this.db
              .select({
                chat_news_id: chat_news_likes.chat_news_id,
                reaction: chat_news_likes.reaction,
              })
              .from(chat_news_likes)
              .where(
                and(
                  inArray(chat_news_likes.chat_news_id, newsIds),
                  eq(chat_news_likes.user_id, userId),
                ),
              )
          : Promise.resolve(
              [] as { chat_news_id: number; reaction: number | null }[],
            ),
      ]);

    const viewedSet = new Set(userViews.map((v) => v.chat_news_id));
    const likeMap = new Map<number, number | null>();
    for (const l of userLikes) likeMap.set(l.chat_news_id, l.reaction);

    const categoryIds = [
      ...new Set(categoryLinks.map((l) => l.chat_news_category_id)),
    ];
    const categories = categoryIds.length
      ? await this.db
          .select()
          .from(chat_news_categories)
          .where(inArray(chat_news_categories.id, categoryIds))
      : [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => {
        const userReaction = likeMap.get(r.id) ?? null;
        return {
          ...r,
          translations: translations.filter((t) => t.chat_news_id === r.id),
          media: media.filter((m) => m.chat_news_id === r.id),
          categories: categoryLinks
            .filter((l) => l.chat_news_id === r.id)
            .map((l) => catMap.get(l.chat_news_category_id))
            .filter(Boolean),
          is_viewed: viewedSet.has(r.id),
          has_liked: userReaction === 1,
          has_disliked: userReaction === -1,
        };
      }),
    };
  }
}
