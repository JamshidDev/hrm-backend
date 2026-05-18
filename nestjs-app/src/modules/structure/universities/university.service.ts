// University service. Laravel: UniversityController.
// scopeSearch: name OR name_ru LIKE. with('city.region') eager load.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { universities } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { UniversityMapper } from '@/modules/structure/universities/university.mapper';
import {
  QueryUniversityDto,
  CreateUniversityDto,
  UpdateUniversityDto,
  UniversityListResponseDto,
} from '@/modules/structure/universities/dto/university.dto';

@Injectable()
export class UniversityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
  ) {}

  async findAll(
    filters: QueryUniversityDto,
  ): Promise<UniversityListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;

    // Count uchun (Builder API).
    const where = and(
      notDeleted(universities),
      filters.search
        ? or(
            ilike(universities.name, `%${filters.search}%`),
            ilike(universities.name_ru, `%${filters.search}%`),
          )
        : undefined,
    );

    // Relational query — city.region eager load.
    const result = await paginate({
      db: this.db,
      countTable: universities,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.universities.findMany({
          where: {
            deleted_at: { isNull: true },
            ...(filters.search
              ? {
                  OR: [
                    { name: { ilike: `%${filters.search}%` } },
                    { name_ru: { ilike: `%${filters.search}%` } },
                  ],
                }
              : {}),
          },
          with: {
            city: { with: { region: { columns: { id: true, name: true } } } },
          },
          // Laravel ORDER BY ishlatmaydi — natural PG order parity uchun.
          limit,
          offset,
        }),
      page,
      perPage,
      // Mapper'ga i18n + lang kerak — wrapper.
      mapper: (row) => UniversityMapper.toItem(row, this.i18n, lang),
    });

    return result;
  }

  async create(dto: CreateUniversityDto): Promise<void> {
    const nextId = await this.nextId();
    await this.db.insert(universities).values({
      id: nextId,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      city_id: dto.city_id,
      education: dto.education,
      type: dto.type,
    });
  }

  async update(id: number, dto: UpdateUniversityDto): Promise<void> {
    await this.findById(id);

    await this.db
      .update(universities)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        city_id: dto.city_id,
        education: dto.education,
        type: dto.type,
      })
      .where(eq(universities.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(universities)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(universities.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: universities.id })
      .from(universities)
      .where(and(eq(universities.id, id), notDeleted(universities)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  private async nextId(): Promise<number> {
    const [row] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${universities.id}), 0)` })
      .from(universities);
    return Number(row?.maxId ?? 0) + 1;
  }
}
