import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { countries } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { findByIdOrFail, softDeleteById } from '@/common/database/crud.helper';
import { CountryMapper } from '@/modules/structure/countries/country.mapper';
import {
  QueryCountryDto,
  CreateCountryDto,
  UpdateCountryDto,
  CountryListResponseDto,
} from '@/modules/structure/countries/dto/country.dto';

@Injectable()
export class CountryService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryCountryDto): Promise<CountryListResponseDto> {
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
        this.db.$count(sql`(${this.db.query.countries.findMany({ where })})`),
      // Laravel: Country::query()->search()->paginate() — orderBy YO'Q (natural order).
      query: ({ limit, offset }) =>
        this.db.query.countries.findMany({
          where,
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: CountryMapper.toItem,
    });
  }

  async create(dto: CreateCountryDto): Promise<void> {
    const [{ maxId }] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${countries.id}), 0)` })
      .from(countries);

    await this.db.insert(countries).values({
      id: Number(maxId) + 1,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      lat: dto.lat ?? null,
      long: dto.long ?? null,
    });
  }

  async update(id: number, dto: UpdateCountryDto): Promise<void> {
    await findByIdOrFail(this.db, countries, id, this.i18n);

    await this.db
      .update(countries)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        lat: dto.lat ?? null,
        long: dto.long ?? null,
      })
      .where(eq(countries.id, id));
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, countries, id, this.i18n);
    await softDeleteById(this.db, countries, id);
  }
}
