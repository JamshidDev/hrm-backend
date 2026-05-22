// Groups service. Laravel: GroupController + LmsProtocolController.
// /lms/groups → list (NOT paginated!).
// /lms/group-workers → paginated nested.
// /lms/protocol → paginated with formatted number.
// /lms/worker-exams → paginated stub.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  edu_plan_workers,
  group_workers,
  groups,
  lms_protocols,
} from '@/db/schema';
import {
  lmsPaginate,
  readPaging,
} from '@/modules/lms/_shared/lms-paginate.util';
import { GroupMapper, ProtocolMapper } from '@/modules/lms/groups/group.mapper';
import type {
  DetachGroupWorkersDto,
  GenerateGroupsDto,
  GroupListQueryDto,
} from '@/modules/lms/groups/dto/group.dto';

@Injectable()
export class LmsGroupService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** POST /lms/generate-groups (stub). */
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(_dto: GenerateGroupsDto) {
    return { success: true, stub: true };
  }

  /** POST /lms/detach-workers-in-group — hard delete. */
  async detachWorkers(dto: DetachGroupWorkersDto) {
    await this.db
      .delete(group_workers)
      .where(
        and(
          eq(group_workers.group_id, dto.group_id),
          inArray(group_workers.worker_id, dto.worker_ids),
        ),
      );
    return { success: true, detached: dto.worker_ids.length };
  }

  /**
   * GET /lms/groups — Laravel: array qaytaradi (paginatsiyasiz).
   * Filter: edu_plan_id (Laravel'da MAJBURIY, biz null'ga toleratemiz).
   */
  async list(q: GroupListQueryDto) {
    const conditions = [notDeleted(groups)];
    if (q.edu_plan_id) conditions.push(eq(groups.edu_plan_id, q.edu_plan_id));
    const where = and(...conditions);

    const rows = await this.db
      .select()
      .from(groups)
      .where(where)
      .orderBy(desc(groups.id));

    if (!rows.length) return [];

    const groupIds = rows.map((g) => g.id);
    const wCount = await this.db
      .select({
        group_id: edu_plan_workers.group_id,
        total: count(),
      })
      .from(edu_plan_workers)
      .where(
        and(
          inArray(edu_plan_workers.group_id, groupIds),
          notDeleted(edu_plan_workers),
        ),
      )
      .groupBy(edu_plan_workers.group_id);

    const workersCount: Record<number, number> = {};
    for (const w of wCount) {
      if (w.group_id != null) workersCount[w.group_id] = Number(w.total);
    }

    return rows.map((r) => GroupMapper.toListItem(r, workersCount));
  }

  /** GET /lms/group-workers — paginatsiya (Laravel: with worker/position/cert). */
  async groupWorkers(q: GroupListQueryDto) {
    const { page, perPage } = readPaging(q);
    const where = q.group_id
      ? eq(group_workers.group_id, q.group_id)
      : undefined;

    return lmsPaginate({
      db: this.db,
      countTable: group_workers,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(group_workers)
          .where(where)
          .limit(limit)
          .offset(offset),
      mapper: (r) => ({
        group_id: r.group_id,
        worker_id: r.worker_id,
        worker_position_id: r.worker_position_id,
      }),
    });
  }

  /** GET /lms/protocol — paginatsiya formatted number bilan. */
  async protocol(q: GroupListQueryDto) {
    const { page, perPage } = readPaging(q);
    const where = notDeleted(lms_protocols);

    return lmsPaginate({
      db: this.db,
      countTable: lms_protocols,
      countWhere: where,
      page,
      perPage,
      query: ({ limit, offset }) =>
        this.db
          .select()
          .from(lms_protocols)
          .where(where)
          .orderBy(desc(lms_protocols.id))
          .limit(limit)
          .offset(offset),
      mapper: ProtocolMapper.toItem,
    });
  }

  /** GET /lms/worker-exams — paginatsiya stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async workerExams(q: GroupListQueryDto) {
    const { page } = readPaging(q);
    return { current_page: page, total: 0, data: [] };
  }
}
