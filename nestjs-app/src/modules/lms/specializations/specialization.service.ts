// Specializations service. Laravel: SpecializationController + SpecializationService.
// List: direction batch join + positions_count batch.
// Detail: positions array (specialization_positions + positions).

import { Injectable } from '@nestjs/common';
import { and, count, eq, ilike, inArray, max, or, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  directions,
  positions,
  specialization_positions,
  specializations,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { SpecializationMapper } from '@/modules/lms/specializations/specialization.mapper';
import type {
  SpecializationListQueryDto,
  UpsertSpecializationDto,
} from '@/modules/lms/specializations/dto/specialization.dto';

@Injectable()
export class LmsSpecializationService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  private async nextId(): Promise<number> {
    const [{ m }] = await this.db
      .select({ m: max(specializations.id) })
      .from(specializations);
    return Number(m ?? 0) + 1;
  }

  /**
   * GET /lms/specializations — list, har spec uchun:
   *   - direction nested (batch select)
   *   - positions_count (batch group-by)
   *
   * Filters:
   *   - search → name|name_ru|name_en ILIKE (Laravel: Specialization::scopeSearch)
   *   - direction_id → faqat shu yo'nalish (extension — Laravel'da yo'q)
   */
  async list(q: SpecializationListQueryDto) {
    const { page, perPage } = readPaging(q);
    const term = q.search?.trim();
    const searchCond = term
      ? or(
          ilike(specializations.name, `%${term}%`),
          ilike(specializations.name_ru, `%${term}%`),
          ilike(specializations.name_en, `%${term}%`),
        )
      : undefined;
    const dirCond =
      q.direction_id != null
        ? eq(specializations.direction_id, Number(q.direction_id))
        : undefined;
    const where = and(notDeleted(specializations), searchCond, dirCond);

    return lmsPaginate({
      db: this.db,
      countTable: specializations,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        // Laravel: Specialization::query()->search()->...->paginate() — orderBy YO'Q.
        this.db
          .select()
          .from(specializations)
          .where(where)
          .limit(limit)
          .offset(offset),
      mapper: () => ({}) as never, // mapList ishlatamiz
      mapList: async (rows) => {
        if (!rows.length) return [];

        const dirIds = [...new Set(rows.map((r) => r.direction_id))];
        const specIds = rows.map((r) => r.id);

        const [dirs, posCounts] = await Promise.all([
          this.db
            .select({ id: directions.id, name: directions.name })
            .from(directions)
            .where(inArray(directions.id, dirIds)),
          this.db
            .select({
              specialization_id: specialization_positions.specialization_id,
              total: count(),
            })
            .from(specialization_positions)
            .where(inArray(specialization_positions.specialization_id, specIds))
            .groupBy(specialization_positions.specialization_id),
        ]);

        const dirMap: Record<number, { id: number; name: string }> = {};
        for (const d of dirs) dirMap[d.id] = d;
        const posCountMap: Record<number, number> = {};
        for (const p of posCounts)
          posCountMap[p.specialization_id] = Number(p.total);

        return rows.map((r) =>
          SpecializationMapper.toListItem(r, dirMap, posCountMap),
        );
      },
    });
  }

  /**
   * GET /lms/specializations/:id — detail bilan direction + positions array.
   */
  async show(id: number) {
    const [row] = await this.db
      .select()
      .from(specializations)
      .where(eq(specializations.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');

    const [[dir], posLinks] = await Promise.all([
      this.db
        .select({ id: directions.id, name: directions.name })
        .from(directions)
        .where(eq(directions.id, row.direction_id))
        .limit(1),
      this.db
        .select({ position_id: specialization_positions.position_id })
        .from(specialization_positions)
        .where(eq(specialization_positions.specialization_id, id)),
    ]);

    const positionIds = posLinks.map((p) => p.position_id);
    const positionRows = positionIds.length
      ? await this.db
          .select({ id: positions.id, name: positions.name })
          .from(positions)
          .where(inArray(positions.id, positionIds))
      : [];

    return SpecializationMapper.toDetail(row, dir ?? null, positionRows);
  }

  /** POST /lms/specializations. */
  async create(dto: UpsertSpecializationDto) {
    const id = await this.nextId();
    await this.db.insert(specializations).values({
      id,
      name: dto.name,
      name_ru: dto.name_ru ?? null,
      name_en: dto.name_en ?? null,
      direction_id: dto.direction_id,
      created_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    });
    // Laravel: `$specialization->positions()->sync($request->positions)`.
    await this.syncPositions(id, dto.positions);
    return this.show(id);
  }

  /** PUT /lms/specializations/:id. */
  async update(id: number, dto: UpsertSpecializationDto) {
    const [row] = await this.db
      .update(specializations)
      .set({
        name: dto.name,
        name_ru: dto.name_ru ?? null,
        name_en: dto.name_en ?? null,
        direction_id: dto.direction_id,
        updated_at: sql`NOW()`,
      })
      .where(eq(specializations.id, id))
      .returning({ id: specializations.id });
    if (!row) throw new BusinessException(404, 'not_found');
    // Laravel: `if ($request->positions) $specialization->positions()->sync(...)`.
    // Faqat array berilgan bo'lsa sync — undefined bo'lsa hech narsa o'zgartirmaymiz.
    if (dto.positions !== undefined) {
      await this.syncPositions(id, dto.positions);
    }
    return this.show(id);
  }

  /** DELETE /lms/specializations/:id — soft-delete + detach all positions. */
  async remove(id: number) {
    const [row] = await this.db
      .update(specializations)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(specializations.id, id))
      .returning({ id: specializations.id });
    if (!row) throw new BusinessException(404, 'not_found');
    // Laravel: `$specialization->positions()->detach()` — clear pivot.
    await this.db
      .delete(specialization_positions)
      .where(eq(specialization_positions.specialization_id, id));
  }

  // Pivot sync (Laravel BelongsToMany::sync): delete then insert.
  private async syncPositions(
    specId: number,
    positionIds: number[] | undefined,
  ): Promise<void> {
    await this.db
      .delete(specialization_positions)
      .where(eq(specialization_positions.specialization_id, specId));
    const ids = [
      ...new Set(
        (positionIds ?? [])
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ];
    if (!ids.length) return;
    await this.db
      .insert(specialization_positions)
      .values(ids.map((pid) => ({ specialization_id: specId, position_id: pid })));
  }
}
