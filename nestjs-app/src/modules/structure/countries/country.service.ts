// Country service. Laravel: Modules/Structure/Http/Controllers/CountryController.
// SoftDeletes faol — `notDeleted(countries)` helper bilan.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { countries } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
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

    // Laravel scopeSearch — name LIKE.
    const where = and(
      notDeleted(countries),
      filters.search ? ilike(countries.name, `%${filters.search}%`) : undefined,
    );

    return paginate({
      db: this.db,
      countTable: countries,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(countries)
          .where(where)
          .orderBy(countries.id)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: CountryMapper.toItem,
    });
  }

  async create(dto: CreateCountryDto): Promise<void> {
    // Laravel: $data['id'] = max(id, withTrashed) + 1 — sequence stale uchun
    // workaround. Laravel parallel ishlayapti — shu mantiq saqlanadi.
    const nextId = await this.nextId();

    await this.db.insert(countries).values({
      id: nextId,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      lat: dto.lat ?? null,
      long: dto.long ?? null,
    });
  }

  async update(id: number, dto: UpdateCountryDto): Promise<void> {
    await this.findById(id);

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
    await this.findById(id);

    // SoftDelete — deleted_at = NOW().
    await this.db
      .update(countries)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(countries.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: countries.id })
      .from(countries)
      .where(and(eq(countries.id, id), notDeleted(countries)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  // Laravel max(id)+1 — withTrashed bo'lganlarni ham qaytaradi.
  private async nextId(): Promise<number> {
    const [row] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${countries.id}), 0)` })
      .from(countries);
    return Number(row?.maxId ?? 0) + 1;
  }
}
