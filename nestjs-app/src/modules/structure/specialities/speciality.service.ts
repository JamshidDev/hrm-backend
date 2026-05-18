// Speciality service. Laravel: SpecialityController.
// scopeSearch: name OR name_ru LIKE.

import { Injectable } from '@nestjs/common';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { specialities } from '@/db/schema';
import { BusinessException } from '@/common/exceptions/business.exception';
import { paginate } from '@/common/pagination/paginate.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
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

    const where = and(
      notDeleted(specialities),
      filters.search
        ? or(
            ilike(specialities.name, `%${filters.search}%`),
            ilike(specialities.name_ru, `%${filters.search}%`),
          )
        : undefined,
    );

    return paginate({
      db: this.db,
      countTable: specialities,
      countWhere: where,
      query: ({ limit, offset }) =>
        // Laravel ORDER BY ishlatmaydi — natural PG order parity uchun.
        this.db
          .select()
          .from(specialities)
          .where(where)
          .limit(limit)
          .offset(offset),
      page,
      perPage,
      mapper: SpecialityMapper.toItem,
    });
  }

  async create(dto: CreateSpecialityDto): Promise<void> {
    const nextId = await this.nextId();
    await this.db.insert(specialities).values({
      id: nextId,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
    });
  }

  async update(id: number, dto: UpdateSpecialityDto): Promise<void> {
    await this.findById(id);
    await this.db
      .update(specialities)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
      })
      .where(eq(specialities.id, id));
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.db
      .update(specialities)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(specialities.id, id));
  }

  // ---- Helper'lar ----

  private async findById(id: number) {
    const [row] = await this.db
      .select({ id: specialities.id })
      .from(specialities)
      .where(and(eq(specialities.id, id), notDeleted(specialities)))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  private async nextId(): Promise<number> {
    const [row] = await this.db
      .select({ maxId: sql<number>`COALESCE(MAX(${specialities.id}), 0)` })
      .from(specialities);
    return Number(row?.maxId ?? 0) + 1;
  }
}
