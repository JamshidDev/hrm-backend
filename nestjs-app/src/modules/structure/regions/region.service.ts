// Region service. Laravel: Modules/Structure/Http/Controllers/RegionController.
// scopeSearch: name LIKE + country_id filter. with('country') eager load.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { regions } from '@/db/schema';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  insertRecord,
  findByIdOrFail,
  softDeleteById,
} from '@/common/database/crud.helper';
import { RegionMapper } from '@/modules/structure/regions/region.mapper';
import {
  QueryRegionDto,
  CreateRegionDto,
  UpdateRegionDto,
  RegionListResponseDto,
} from '@/modules/structure/regions/dto/region.dto';

@Injectable()
export class RegionService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  async findAll(filters: QueryRegionDto): Promise<RegionListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    // Bitta manba — count (Builder SQL) va list (relational object) bir xil
    // filterdan kelib chiqadi (divergensiya/total mismatch oldini oladi).
    const { countWhere, listWhere } = this.buildFilters(filters);

    return paginate({
      db: this.db,
      countTable: regions,
      countWhere,
      // Relational API — country eager load.
      query: ({ limit, offset }) =>
        this.db.query.regions.findMany({
          where: listWhere,
          with: { country: true },
          orderBy: { id: 'asc' },
          limit,
          offset,
        }),
      page,
      perPage,
      mapper: RegionMapper.toItem,
    });
  }

  // Count (Builder SQL) + list (relational object) filtri — BITTA manbadan.
  // Laravel scopeSearch (name LIKE) + country_id filter.
  private buildFilters(filters: QueryRegionDto) {
    const { search, country_id } = filters;
    return {
      countWhere: and(
        notDeleted(regions),
        search ? ilike(regions.name, `%${search}%`) : undefined,
        country_id ? eq(regions.country_id, country_id) : undefined,
      ),
      listWhere: {
        // `as const` — method'dan qaytganda `true` literal saqlanadi (drizzle
        // RelationsFieldFilter `isNull: true` kutadi, `boolean` emas).
        deleted_at: { isNull: true as const },
        ...(search ? { name: { ilike: `%${search}%` } } : {}),
        ...(country_id ? { country_id } : {}),
      },
    };
  }

  async create(dto: CreateRegionDto): Promise<void> {
    // id'siz — insertRecord atomik MAX+1 beradi (transaction + advisory lock).
    await insertRecord(this.db, regions, {
      country_id: dto.country_id,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      lat: dto.lat ?? null,
      long: dto.long ?? null,
    });
  }

  async update(id: number, dto: UpdateRegionDto): Promise<void> {
    await findByIdOrFail(this.db, regions, id, this.i18n);

    await this.db
      .update(regions)
      .set({
        country_id: dto.country_id,
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        lat: dto.lat ?? null,
        long: dto.long ?? null,
      })
      .where(eq(regions.id, id));
  }

  async remove(id: number): Promise<void> {
    await findByIdOrFail(this.db, regions, id, this.i18n);
    await softDeleteById(this.db, regions, id);
  }
}
