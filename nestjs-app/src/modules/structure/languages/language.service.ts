// Language service. Laravel: Modules/Structure/Http/Controllers/LanguageController.
// scopeSearch: name LIKE.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { languages } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { LanguageMapper } from '@/modules/structure/languages/language.mapper';
import {
  QueryLanguageDto,
  CreateLanguageDto,
  UpdateLanguageDto,
  LanguageListResponseDto,
} from '@/modules/structure/languages/dto/language.dto';

@Injectable()
export class LanguageService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryLanguageDto): Promise<LanguageListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;

    const where = and(
      notDeleted(languages),
      filters.search ? ilike(languages.name, `%${filters.search}%`) : undefined,
    );

    return paginate({
      db: this.db,
      countTable: languages,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(languages)
          .where(where)
          .orderBy(languages.id)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: LanguageMapper.toItem,
    });
  }

  async create(dto: CreateLanguageDto): Promise<void> {
    const nextId = await this.nextId();

    await this.db.insert(languages).values({
      id: nextId,
      name: dto.name,
      name_ru: dto.name_ru,
      name_en: dto.name_en,
    });
  }

  async update(id: number, dto: UpdateLanguageDto): Promise<void> {
    await this.findById(id);

    await this.db
      .update(languages)
      .set({
        name: dto.name,
        name_ru: dto.name_ru,
        name_en: dto.name_en,
      })
      .where(eq(languages.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);

    await this.db
      .update(languages)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(languages.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: languages.id })
      .from(languages)
      .where(and(eq(languages.id, id), notDeleted(languages)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  private async nextId(): Promise<number> {
    const [row] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${languages.id}), 0)` })
      .from(languages);
    return Number(row?.maxId ?? 0) + 1;
  }
}
