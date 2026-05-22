// Directions service. Laravel: DirectionController + DirectionService.

import { Injectable } from '@nestjs/common';
import { desc, eq, max, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { directions } from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { DirectionMapper } from '@/modules/lms/directions/direction.mapper';
import type {
  DirectionListQueryDto,
  UpsertDirectionDto,
} from '@/modules/lms/directions/dto/direction.dto';

@Injectable()
export class LmsDirectionService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** Laravel parallel ishlaganda PG sequence konflikti bo'lmasligi uchun MAX+1. */
  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(directions.id) })
      .from(directions);
    return Number(m ?? 0) + 1;
  }

  /** GET /lms/directions — paginatsiyalangan ro'yxat (Laravel-parity). */
  async list(q: DirectionListQueryDto) {
    const { page, perPage } = readPaging(q);
    const where = notDeleted(directions);
    return lmsPaginate({
      db: this.db,
      countTable: directions,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(directions)
          .where(where)
          .orderBy(desc(directions.id))
          .limit(limit)
          .offset(offset),
      mapper: DirectionMapper.toItem,
    });
  }

  /** GET /lms/directions/:id — bitta yo'nalish. */
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return DirectionMapper.toItem(row);
  }

  /** POST /lms/directions — yangi yo'nalish yaratish. */
  async create(dto: UpsertDirectionDto) {
    const id = await this.nextId();
    const [row] = await this.db
      .insert(directions)
      .values({
        id,
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning();
    return DirectionMapper.toItem(row);
  }

  /** PUT /lms/directions/:id — yangilash. */
  async update(id: number, dto: UpsertDirectionDto) {
    const [row] = await this.db
      .update(directions)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(directions.id, id))
      .returning();
    if (!row) throw new BusinessException(404, 'not_found');
    return DirectionMapper.toItem(row);
  }

  /** DELETE /lms/directions/:id — soft-delete. */
  async remove(id: number) {
    const [row] = await this.db
      .update(directions)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(directions.id, id))
      .returning({ id: directions.id });
    if (!row) throw new BusinessException(404, 'not_found');
  }
}
