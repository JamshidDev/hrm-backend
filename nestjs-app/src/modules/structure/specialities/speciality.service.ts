import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { specialities } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { SpecialityMapper } from '@/modules/structure/specialities/speciality.mapper';
import {
  QuerySpecialityDto,
  CreateSpecialityDto,
  UpdateSpecialityDto,
  SpecialityListResponseDto,
} from '@/modules/structure/specialities/dto/speciality.dto';

@Injectable()
export class SpecialityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(
    filters: QuerySpecialityDto,
  ): Promise<SpecialityListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
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
          sql`(${this.db.query.specialities.findMany({ where })})`,
        ),
      query: ({ limit, offset }) =>
        this.db.query.specialities.findMany({ where, limit, offset }),
      page,
      perPage,
      mapper: SpecialityMapper.toItem,
    });
  }

  async create(dto: CreateSpecialityDto): Promise<void> {
    const [{ maxId }] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${specialities.id}), 0)` })
      .from(specialities);

    await this.db.insert(specialities).values({
      id: Number(maxId) + 1,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
    });
  }

  async update(id: number, dto: UpdateSpecialityDto): Promise<void> {
    await findByIdOrFail(this.db, specialities, id, this.i18n);
    await this.db
      .update(specialities)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
      })
      .where(eq(specialities.id, id));
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, specialities, id, this.i18n);
    await softDeleteById(this.db, specialities, id);
  }
}
