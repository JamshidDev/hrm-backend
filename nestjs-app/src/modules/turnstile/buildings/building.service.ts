// Building service. Laravel: Turnstile/BuildingController.

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { buildings } from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  CreateBuildingDto,
  QueryBuildingDto,
  UpdateBuildingDto,
} from '@/modules/turnstile/buildings/dto/building.dto';

@Injectable()
export class BuildingService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: QueryBuildingDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(
      notDeleted(buildings),
      q.search ? ilike(buildings.name, `%${q.search}%`) : sql`TRUE`,
    );
    // Laravel default order — `id ASC` (no explicit orderBy in controller).
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: buildings.id,
          name: buildings.name,
          name_ru: buildings.name_ru,
          name_en: buildings.name_en,
        })
        .from(buildings)
        .where(where)
        .orderBy(buildings.id)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(buildings).where(where),
    ]);
    return {
      current_page: page,
      total: Number(total),
      data: rows,
    };
  }

  async create(dto: CreateBuildingDto) {
    const id = await nextId(this.db, buildings);
    await this.db.insert(buildings).values({ id, ...dto });
  }

  async update(id: number, dto: UpdateBuildingDto) {
    const [row] = await this.db
      .select({ id: buildings.id })
      .from(buildings)
      .where(eq(buildings.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    await this.db
      .update(buildings)
      .set({ ...dto, updated_at: sql`NOW()` })
      .where(eq(buildings.id, id));
  }

  async remove(id: number) {
    await this.db
      .update(buildings)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(buildings.id, id));
  }
}
