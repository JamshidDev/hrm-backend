import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { cities } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { CityMapper } from '@/modules/structure/cities/city.mapper';
import {
  QueryCityDto,
  CreateCityDto,
  UpdateCityDto,
  CityListResponseDto,
} from '@/modules/structure/cities/dto/city.dto';

@Injectable()
export class CityService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryCityDto): Promise<CityListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const { search, region_id } = filters;
    const where = {
      deleted_at: { isNull: true as const },
      ...(search ? { name: { ilike: `%${search}%` } } : {}),
      ...(region_id ? { region_id } : {}),
    };

    return paginate({
      db: this.db,
      count: () =>
        this.db.$count(sql`(${this.db.query.cities.findMany({ where })})`),
      query: ({ limit, offset }) =>
        this.db.query.cities.findMany({
          where,
          with: {
            region: { columns: { id: true, name: true } },
          },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: CityMapper.toItem,
    });
  }

  async create(dto: CreateCityDto): Promise<void> {
    const [{ maxId }] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${cities.id}), 0)` })
      .from(cities);

    await this.db.insert(cities).values({
      id: Number(maxId) + 1,
      region_id: dto.region_id,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      lat: dto.lat ?? null,
      long: dto.long ?? null,
    });
  }

  async update(id: number, dto: UpdateCityDto): Promise<void> {
    await findByIdOrFail(this.db, cities, id, this.i18n);

    await this.db
      .update(cities)
      .set({
        region_id: dto.region_id,
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        lat: dto.lat ?? null,
        long: dto.long ?? null,
      })
      .where(eq(cities.id, id));
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, cities, id, this.i18n);
    await softDeleteById(this.db, cities, id);
  }
}
