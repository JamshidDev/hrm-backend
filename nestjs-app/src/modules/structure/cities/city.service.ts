// City service. Laravel: Modules/Structure/Http/Controllers/CityController.
// scopeSearch: name LIKE + region_id filter. with('region.country') eager (lekin
// CityResource faqat region.id va region.name dan foydalanadi).

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { cities } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { nowDb } from '@/common/utils/datetime.util';
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

    const where = and(
      notDeleted(cities),
      filters.search ? ilike(cities.name, `%${filters.search}%`) : undefined,
      filters.region_id ? eq(cities.region_id, filters.region_id) : undefined,
    );

    return paginate({
      db: this.db,
      countTable: cities,
      countWhere: where,
      query: ({ limit, offset }) =>
        this.db.query.cities.findMany({
          where: {
            deleted_at: { isNull: true },
            ...(filters.search
              ? { name: { ilike: `%${filters.search}%` } }
              : {}),
            ...(filters.region_id ? { region_id: filters.region_id } : {}),
          },
          with: {
            region: { columns: { id: true, name: true } },
          },
          // Laravel ORDER BY ishlatmaydi — natural PG order. Bir xil DB'da bir
          // xil query plan → bir xil tartib. ORDER BY qo'shsak Laravel'dan farq qiladi.
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: CityMapper.toItem,
    });
  }

  async create(dto: CreateCityDto): Promise<void> {
    const nextId = await this.nextId();

    await this.db.insert(cities).values({
      id: nextId,
      region_id: dto.region_id,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      lat: dto.lat ?? null,
      long: dto.long ?? null,
    });
  }

  async update(id: number, dto: UpdateCityDto): Promise<void> {
    await this.findById(id);

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
    await this.findById(id);

    // Laravel softDelete app vaqti (now()) bilan yozadi — DB NOW() emas.
    await this.db
      .update(cities)
      .set({ deleted_at: nowDb() })
      .where(eq(cities.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    // drizzle-v2 relational API — bitta yozuv mavjudligini tekshirish.
    const city = await this.db.query.cities.findFirst({
      columns: { id: true },
      where: { id, deleted_at: { isNull: true } },
    });
    if (!city) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return city;
  }

  private async nextId(): Promise<number> {
    const [maxIdRow] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${cities.id}), 0)` })
      .from(cities);
    return Number(maxIdRow?.maxId ?? 0) + 1;
  }
}
