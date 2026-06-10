import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { universities } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
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
    const { search } = filters;
    const where = {
      deleted_at: { isNull: true as const },
      ...(search
        ? {
            OR: [
              { name: { ilike: `%${search}%` } },
              { name_ru: { ilike: `%${search}%` } },
            ],
          }
        : {}),
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(
          sql`(${this.db.query.universities.findMany({ where })})`,
        ),
      query: ({ limit, offset }) =>
        this.db.query.universities.findMany({
          where,
          with: {
            city: { with: { region: { columns: { id: true, name: true } } } },
          },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: (row) => UniversityMapper.toItem(row, this.i18n, lang),
    });
  }

  async create(dto: CreateUniversityDto): Promise<void> {
    const [{ maxId }] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${universities.id}), 0)` })
      .from(universities);

    await this.db.insert(universities).values({
      id: Number(maxId) + 1,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      city_id: dto.city_id,
      education: dto.education,
      type: dto.type,
    });
  }

  async update(id: number, dto: UpdateUniversityDto): Promise<void> {
    await findByIdOrFail(this.db, universities, id, this.i18n);

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
    await findByIdOrFail(this.db, universities, id, this.i18n);
    await softDeleteById(this.db, universities, id);
  }
}
