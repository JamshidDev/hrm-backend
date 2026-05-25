// Schedule group service. Laravel: TurnstileScheduleGroupController.

import { Injectable } from '@nestjs/common';
import { count, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { turnstile_schedule_groups, workers } from '@/db/schema';
import { pageOf } from '@/modules/turnstile/_shared/helpers';
import type {
  QueryScheduleGroupDto,
  QueryScheduleGroupWorkersDto,
  UpdateScheduleGroupDto,
} from '@/modules/turnstile/schedule-groups/dto/schedule-group.dto';

@Injectable()
export class ScheduleGroupService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  async list(q: QueryScheduleGroupDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(turnstile_schedule_groups);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(turnstile_schedule_groups)
        .where(where)
        .orderBy(turnstile_schedule_groups.order)
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(turnstile_schedule_groups)
        .where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  async remove(groupId: number) {
    await this.db
      .update(turnstile_schedule_groups)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(turnstile_schedule_groups.id, groupId));
  }

  async update(groupId: number, dto: UpdateScheduleGroupDto) {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.order !== undefined) data.order = dto.order;
    await this.db
      .update(turnstile_schedule_groups)
      .set(data)
      .where(eq(turnstile_schedule_groups.id, groupId));
  }

  // Laravel: groupWorkers — paginated distinct workers belonging to a schedule group.
  async groupWorkers(q: QueryScheduleGroupWorkersDto) {
    const { page, perPage, offset } = pageOf(q);
    if (!q.group_id) {
      return {
        current_page: page,
        per_page: perPage,
        total: 0,
        data: [] as Array<unknown>,
      };
    }
    const result = await this.db.execute(sql`
      SELECT DISTINCT worker_id, worker_position_id
      FROM turnstile_worker_schedules
      WHERE turnstile_schedule_group_id = ${Number(q.group_id)}
        AND deleted_at IS NULL
      LIMIT ${perPage} OFFSET ${offset}
    `);
    const countResult = await this.db.execute(sql`
      SELECT COUNT(DISTINCT worker_id)::int AS total
      FROM turnstile_worker_schedules
      WHERE turnstile_schedule_group_id = ${Number(q.group_id)}
        AND deleted_at IS NULL
    `);
    const rows = ((result as any).rows ?? result) as Array<{
      worker_id: number;
      worker_position_id: number;
    }>;
    const total = Number(
      ((countResult as any).rows ?? countResult)[0]?.total ?? 0,
    );
    const workerIds = rows.map((r) => Number(r.worker_id)).filter(Boolean);
    const wRows = workerIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
          })
          .from(workers)
          .where(inArray(workers.id, workerIds))
      : [];
    const wMap = new Map<number, (typeof wRows)[number]>(
      wRows.map((w) => [w.id, w] as const),
    );
    return {
      current_page: page,
      per_page: perPage,
      total,
      data: rows.map((r) => ({
        worker_position_id: r.worker_position_id,
        worker: wMap.get(Number(r.worker_id)) ?? null,
      })),
    };
  }
}
