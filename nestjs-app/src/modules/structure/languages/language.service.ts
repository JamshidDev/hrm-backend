import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { languages } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
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
    const { search } = filters;
    const where = {
      deleted_at: { isNull: true as const },
      ...(search ? { name: { ilike: `%${search}%` } } : {}),
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.languages.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.languages.findMany({
          where,
          orderBy: { id: 'asc' },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: LanguageMapper.toItem,
    });
  }

  async create(dto: CreateLanguageDto): Promise<void> {
    const [{ maxId }] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${languages.id}), 0)` })
      .from(languages);

    await this.db.insert(languages).values({
      id: Number(maxId) + 1,
      name: dto.name,
      name_ru: dto.name_ru,
      name_en: dto.name_en,
    });
  }

  async update(id: number, dto: UpdateLanguageDto): Promise<void> {
    await findByIdOrFail(this.db, languages, id, this.i18n);

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
    await findByIdOrFail(this.db, languages, id, this.i18n);
    await softDeleteById(this.db, languages, id);
  }
}
