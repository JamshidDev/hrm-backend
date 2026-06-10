// City service. Laravel: Modules/Structure/Http/Controllers/CityController.
// scopeSearch: name LIKE + region_id filter. with('region.country') eager (lekin
// CityResource faqat region.id va region.name dan foydalanadi).

import { Injectable } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { cities } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  insertRecord,
  findByIdOrFail,
  softDeleteById,
} from '@/common/database/crud.helper';
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
    // Bitta manba — count va list bir xil filterdan (divergensiya oldini oladi).
    const { countWhere, listWhere } = this.buildFilters(filters);

    return paginate({
      db: this.db,
      countTable: cities,
      countWhere,
      query: ({ limit, offset }) =>
        this.db.query.cities.findMany({
          where: listWhere,
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

  // Count (Builder SQL) + list (relational object) filtri — BITTA manbadan.
  // Laravel scopeSearch (name LIKE) + region_id filter.
  private buildFilters(filters: QueryCityDto) {
    const { search, region_id } = filters;
    return {
      countWhere: and(
        notDeleted(cities),
        search ? ilike(cities.name, `%${search}%`) : undefined,
        region_id ? eq(cities.region_id, region_id) : undefined,
      ),
      listWhere: {
        deleted_at: { isNull: true as const },
        ...(search ? { name: { ilike: `%${search}%` } } : {}),
        ...(region_id ? { region_id } : {}),
      },
    };
  }

  async create(dto: CreateCityDto): Promise<void> {
    // id'siz — insertRecord atomik MAX+1 beradi (transaction + advisory lock).
    await insertRecord(this.db, cities, {
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
