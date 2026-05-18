// Schedule type service. Laravel: TurnstileScheduleTypeController.

import { Injectable } from '@nestjs/common';
import { count, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { turnstile_schedule_groups, turnstile_schedule_types } from '@/db/schema';
import { nextId, pageOf, scheduleTypeName } from '@/modules/turnstile/_shared/helpers';
import type {
  CreateScheduleTypeDto,
  QueryScheduleTypeDto,
  UpdateScheduleTypeDto,
} from '@/modules/turnstile/schedule-types/dto/schedule-type.dto';

@Injectable()
export class ScheduleTypeService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  // Laravel: index — flat array (no pagination), no Resource (raw map).
  async list() {
    const rows = await this.db
      .select()
      .from(turnstile_schedule_types)
      .where(notDeleted(turnstile_schedule_types))
      .orderBy(turnstile_schedule_types.type);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: { id: r.type, name: scheduleTypeName(r.type) },
      days: r.days,
    }));
  }

  // Laravel: indexByWorkers — paginated with workers_count_sum and groups_count.
  // ScheduleTypeResource: {id, name (locale), type: {id, name}, groups, workers, days}.
  async listByWorkers(q: QueryScheduleTypeDto) {
    const { page, perPage, offset } = pageOf(q);
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();
    const where = notDeleted(turnstile_schedule_types);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(turnstile_schedule_types)
        .where(where)
        .orderBy(turnstile_schedule_types.type)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(turnstile_schedule_types).where(where),
    ]);

    // Per-type: groups count + workers count (sum of group.workers_count).
    const counts = rows.length
      ? await Promise.all(
          rows.map(async (r) => {
            const [groupsRow] = await this.db
              .select({ c: count() })
              .from(turnstile_schedule_groups)
              .where(
                eq(turnstile_schedule_groups.turnstile_schedule_type_id, r.id),
              );
            const [workersRow] = await this.db
              .select({
                s: sql<number>`COALESCE(SUM(${turnstile_schedule_groups.workers_count}), 0)::int`,
              })
              .from(turnstile_schedule_groups)
              .where(
                eq(turnstile_schedule_groups.turnstile_schedule_type_id, r.id),
              );
            return {
              id: r.id,
              groups: Number(groupsRow?.c ?? 0),
              workers: Number(workersRow?.s ?? 0),
            };
          }),
        )
      : [];
    const cMap = new Map<number, { groups: number; workers: number }>(
      counts.map((c) => [c.id, { groups: c.groups, workers: c.workers }]),
    );

    const localeName = (r: typeof rows[number]): string => {
      if (lang === 'ru') return r.name_ru ?? r.name;
      if (lang === 'en') return r.name_en ?? r.name;
      return r.name;
    };

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows.map((r) => ({
        id: r.id,
        name: localeName(r),
        type: { id: r.type, name: scheduleTypeName(r.type) },
        groups: cMap.get(r.id)?.groups ?? 0,
        workers: cMap.get(r.id)?.workers ?? 0,
        days: r.days,
      })),
    };
  }

  async create(dto: CreateScheduleTypeDto) {
    const id = await nextId(this.db, turnstile_schedule_types);
    await this.db.insert(turnstile_schedule_types).values({
      id,
      name: dto.name,
      type: dto.type,
      days: dto.days,
    } as any);
  }

  async update(id: number, dto: UpdateScheduleTypeDto) {
    await this.db
      .update(turnstile_schedule_types)
      .set({
        name: dto.name,
        type: dto.type,
        days: dto.days as any,
        updated_at: sql`NOW()`,
      })
      .where(eq(turnstile_schedule_types.id, id));
  }

  async remove(id: number) {
    await this.db
      .update(turnstile_schedule_types)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(turnstile_schedule_types.id, id));
  }
}
