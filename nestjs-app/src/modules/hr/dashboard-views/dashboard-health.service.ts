// HR Dashboard Views — nogironlik va kasallik varaqasi preview endpointlari.
// worker-disabilities, worker-relative-disabilities, worker-sick-leaves.

import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  departments,
  organizations,
  positions as positionsTable,
  worker_disabilities,
  worker_positions,
  worker_relative_disabilities,
  worker_relatives,
  worker_sick_leaves,
  workers,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { MinioService } from '@/shared/minio/minio.service';
import { DashboardViewsMapper } from '@/modules/hr/dashboard-views/dashboard-views.mapper';
import { DEFAULT_PER_PAGE } from '@/modules/hr/dashboard-views/dashboard-views.constants';
import { wpCols } from '@/modules/hr/dashboard-views/dashboard-views.query';
import {
  calcAge,
  relativeLabel,
  todayDate,
} from '@/modules/hr/dashboard-views/dashboard-views.helper';
import {
  DisabilityPreviewQueryDto,
  SickLeavePreviewQueryDto,
} from '@/modules/hr/dashboard-views/dto/dashboard-views.dto';

@Injectable()
export class DashboardHealthService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly minio: MinioService,
    private readonly mapper: DashboardViewsMapper,
    private readonly scope: OrgScopeService,
  ) {}

  // GET /api/v1/hr/dashboard/worker-disabilities/preview
  async workerDisabilitiesPreview(filters: DisabilityPreviewQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    // Laravel: ->when(request('search'), whereHas('worker', searchByFullName)).
    const searchCond = buildWorkerSearchCond(filters.search);
    const activeWorker = await this.scope.activeWorkerExists(
      worker_disabilities.worker_id,
    );
    const where = and(
      notDeleted(worker_disabilities),
      filters.level != null
        ? eq(worker_disabilities.level, filters.level)
        : undefined,
      activeWorker,
      searchCond
        ? sql`EXISTS (SELECT 1 FROM ${workers} WHERE ${workers.id} = ${worker_disabilities.worker_id} AND (${searchCond}))`
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(worker_disabilities)
        .where(where)
        .orderBy(desc(worker_disabilities.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_disabilities).where(where),
    ]);

    const workerIds = [...new Set(rows.map((r) => r.worker_id))];
    const flatMap = await this.bundleWorkerFlatPosition(workerIds);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const flat = flatMap.get(r.worker_id);
        return {
          id: r.id,
          worker: flat?.worker ?? null,
          organization: flat?.organization ?? null,
          department: flat?.department ?? null,
          position: flat?.position ?? null,
          contract_type: flat?.contract_type ?? null,
          level: r.level,
          number: r.number,
          from: r.from,
          to: r.to,
          comment: r.comment,
        };
      }),
    };
  }

  // GET /api/v1/hr/dashboard/worker-relative-disabilities/preview
  async workerRelativeDisabilitiesPreview(filters: DisabilityPreviewQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;

    // Laravel: ->when(request('search'), whereHas('worker', searchByFullName)).
    const searchCond = buildWorkerSearchCond(filters.search);
    const activeWorker = await this.scope.activeWorkerExists(sql`wr.worker_id`);
    const where = and(
      notDeleted(worker_relative_disabilities),
      filters.level != null
        ? eq(worker_relative_disabilities.level, filters.level)
        : undefined,
      // worker_relatives → workers → faol worker_position (scope-aware).
      sql`EXISTS (
        SELECT 1 FROM ${worker_relatives} wr
        WHERE wr.id = ${worker_relative_disabilities.worker_relative_id}
          AND ${activeWorker}
      )`,
      // Qidiruv — qarindoshning xodimi (worker) FIO bo'yicha.
      searchCond
        ? sql`EXISTS (
            SELECT 1 FROM ${worker_relatives} wr2
            JOIN ${workers} ON ${workers.id} = wr2.worker_id
            WHERE wr2.id = ${worker_relative_disabilities.worker_relative_id}
              AND (${searchCond})
          )`
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_relative_disabilities.id,
          level: worker_relative_disabilities.level,
          number: worker_relative_disabilities.number,
          from: worker_relative_disabilities.from,
          to: worker_relative_disabilities.to,
          comment: worker_relative_disabilities.comment,
          relative_id: worker_relatives.id,
          relative_worker_id: worker_relatives.worker_id,
          relative_relative: worker_relatives.relative,
          relative_last: worker_relatives.last_name,
          relative_first: worker_relatives.first_name,
          relative_middle: worker_relatives.middle_name,
          relative_birthday: worker_relatives.birthday,
        })
        .from(worker_relative_disabilities)
        .leftJoin(
          worker_relatives,
          eq(
            worker_relatives.id,
            worker_relative_disabilities.worker_relative_id,
          ),
        )
        .where(where)
        .orderBy(desc(worker_relative_disabilities.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(worker_relative_disabilities)
        .leftJoin(
          worker_relatives,
          eq(
            worker_relatives.id,
            worker_relative_disabilities.worker_relative_id,
          ),
        )
        .where(where),
    ]);

    const workerIds = [
      ...new Set(
        rows
          .map((r) => r.relative_worker_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const flatMap = await this.bundleWorkerFlatPosition(workerIds);

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const flat = r.relative_worker_id
          ? flatMap.get(r.relative_worker_id)
          : undefined;
        return {
          id: r.id,
          worker: flat?.worker ?? null,
          organization: flat?.organization ?? null,
          department: flat?.department ?? null,
          position: flat?.position ?? null,
          contract_type: flat?.contract_type ?? null,
          relative: {
            id: r.relative_id,
            relative: r.relative_relative,
            relative_name:
              r.relative_relative != null
                ? relativeLabel(r.relative_relative)
                : null,
            last_name: r.relative_last,
            first_name: r.relative_first,
            middle_name: r.relative_middle,
            birthday: r.relative_birthday,
          },
          level: r.level,
          number: r.number,
          from: r.from,
          to: r.to,
          comment: r.comment,
        };
      }),
    };
  }

  // GET /api/v1/hr/dashboard/worker-sick-leaves/preview
  async workerSickLeavesPreview(filters: SickLeavePreviewQueryDto) {
    const perPage = filters.per_page ?? DEFAULT_PER_PAGE;
    const page = filters.page ?? 1;
    const offset = (page - 1) * perPage;
    const today = todayDate();

    // Laravel: ->when(request('search'), whereHas('worker', searchByFullName)).
    const searchCond = buildWorkerSearchCond(filters.search);
    const where = and(
      notDeleted(worker_sick_leaves),
      filters.type != null
        ? eq(worker_sick_leaves.type, filters.type)
        : undefined,
      filters.status === 'active'
        ? and(
            lte(worker_sick_leaves.from_date, today),
            or(
              isNull(worker_sick_leaves.to_date),
              gte(worker_sick_leaves.to_date, today),
            ),
          )
        : filters.status === 'finished'
          ? sql`${worker_sick_leaves.to_date} < ${today}::date`
          : undefined,
      // Laravel: whereHas('workerPosition', filter) — scope-aware EXISTS.
      await this.scope.activePositionByIdExists(
        worker_sick_leaves.worker_position_id,
      ),
      searchCond
        ? sql`EXISTS (SELECT 1 FROM ${workers} WHERE ${workers.id} = ${worker_sick_leaves.worker_id} AND (${searchCond}))`
        : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_sick_leaves.id,
          type: worker_sick_leaves.type,
          from_date: worker_sick_leaves.from_date,
          to_date: worker_sick_leaves.to_date,
          sick: worker_sick_leaves.sick,
          worker_id: worker_sick_leaves.worker_id,
          worker_position_id: worker_sick_leaves.worker_position_id,
        })
        .from(worker_sick_leaves)
        .where(where)
        .orderBy(desc(worker_sick_leaves.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_sick_leaves).where(where),
    ]);

    const wpIds = [
      ...new Set(
        rows
          .map((r) => r.worker_position_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const wpRows = wpIds.length
      ? await this.selectWorkerPositionsBaseByWpIds(wpIds)
      : [];
    const wpMap = new Map<number, (typeof wpRows)[number]>();
    for (const wp of wpRows) wpMap.set(wp.wp_id, wp);

    const workerIds = [
      ...new Set(
        rows.map((r) => r.worker_id).filter((id): id is number => id != null),
      ),
    ];
    const workerMap = await this.mapper.bundleWorkers(workerIds);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const wp = r.worker_position_id
            ? wpMap.get(r.worker_position_id)
            : null;
          const w = r.worker_id ? workerMap.get(r.worker_id) : null;
          return {
            id: r.id,
            type: r.type,
            from_date: r.from_date,
            to_date: r.to_date,
            sick: r.sick,
            worker_position_id: r.worker_position_id,
            worker: w
              ? {
                  id: w.id,
                  uuid: w.uuid,
                  last_name: w.last_name,
                  first_name: w.first_name,
                  middle_name: w.middle_name,
                  birthday: w.birthday,
                  photo: await this.minio.fileUrl(w.photo),
                }
              : null,
            worker_position: wp
              ? {
                  id: wp.wp_id,
                  type: wp.wp_type,
                  organization: wp.org_id
                    ? {
                        id: wp.org_id,
                        name: this.mapper.pickLang(
                          wp.org_name,
                          wp.org_name_ru,
                          wp.org_name_en,
                        ),
                        group: wp.org_group ?? false,
                      }
                    : null,
                  department: wp.dept_id
                    ? {
                        id: wp.dept_id,
                        name: wp.dept_name,
                        level: wp.dept_level,
                      }
                    : null,
                  position: wp.pos_id
                    ? {
                        id: wp.pos_id,
                        name: this.mapper.pickLang(
                          wp.pos_name,
                          wp.pos_name_ru,
                          wp.pos_name_en,
                        ),
                      }
                    : null,
                }
              : null,
          };
        }),
      ),
    };
  }

  // ---- helpers ----

  private async selectWorkerPositionsBaseByWpIds(wpIds: number[]) {
    return this.db
      .select(wpCols)
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .where(inArray(worker_positions.id, wpIds));
  }

  // Worker + uning faol pozitsiyasi (HasOne status=2) — flat shape.
  // Disability preview'lar uchun. Laravel: $worker->position (HasOne status=ACTIVE).
  private async bundleWorkerFlatPosition(workerIds: number[]) {
    const map = new Map<
      number,
      {
        worker: {
          id: number;
          uuid: string;
          photo: string | null;
          last_name: string | null;
          first_name: string | null;
          middle_name: string | null;
          birthday: string | null;
          education: number | null;
          age: number;
        };
        organization: {
          id: number;
          name: string | null;
          group: boolean;
        } | null;
        department: {
          id: number;
          name: string | null;
          level: number | null;
        } | null;
        position: { id: number; name: string | null } | null;
        contract_type: string | null;
      }
    >();
    if (workerIds.length === 0) return map;

    const [workersRows, wpRows] = await Promise.all([
      // Laravel disability preview `with('worker:id,uuid,...,photo')` — `education`
      // ustuni tanlanmaydi, shuning uchun resource'da `education` doim null.
      this.db
        .select({
          id: workers.id,
          uuid: workers.uuid,
          photo: workers.photo,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          birthday: workers.birthday,
        })
        .from(workers)
        .where(inArray(workers.id, workerIds)),
      this.db
        .select({
          worker_id: worker_positions.worker_id,
          wp_type: worker_positions.type,
          org_id: organizations.id,
          org_name: organizations.name,
          org_name_ru: organizations.name_ru,
          org_name_en: organizations.name_en,
          org_group: organizations.group,
          dept_id: departments.id,
          dept_name: departments.name,
          dept_level: departments.level,
          pos_id: positionsTable.id,
          pos_name: positionsTable.name,
          pos_name_ru: positionsTable.name_ru,
          pos_name_en: positionsTable.name_en,
        })
        .from(worker_positions)
        .leftJoin(
          organizations,
          and(
            eq(organizations.id, worker_positions.organization_id),
            isNull(organizations.deleted_at),
          ),
        )
        .leftJoin(
          departments,
          eq(departments.id, worker_positions.department_id),
        )
        .leftJoin(
          positionsTable,
          eq(positionsTable.id, worker_positions.position_id),
        )
        .where(
          and(
            inArray(worker_positions.worker_id, workerIds),
            eq(worker_positions.status, 2),
            notDeleted(worker_positions),
          ),
        )
        .orderBy(asc(worker_positions.id)),
    ]);

    const posByWorker = new Map<number, (typeof wpRows)[number]>();
    for (const wp of wpRows) {
      if (wp.worker_id == null) continue;
      if (!posByWorker.has(wp.worker_id)) posByWorker.set(wp.worker_id, wp);
    }

    for (const w of workersRows) {
      const pos = posByWorker.get(w.id);
      map.set(w.id, {
        worker: {
          id: w.id,
          uuid: w.uuid,
          photo: await this.minio.fileUrl(w.photo),
          last_name: w.last_name,
          first_name: w.first_name,
          middle_name: w.middle_name,
          birthday: w.birthday,
          education: null,
          age: calcAge(w.birthday),
        },
        organization: pos?.org_id
          ? {
              id: pos.org_id,
              name: this.mapper.pickLang(
                pos.org_name,
                pos.org_name_ru,
                pos.org_name_en,
              ),
              group: pos.org_group ?? false,
            }
          : null,
        department: pos?.dept_id
          ? { id: pos.dept_id, name: pos.dept_name, level: pos.dept_level }
          : null,
        position: pos?.pos_id
          ? {
              id: pos.pos_id,
              name: this.mapper.pickLang(
                pos.pos_name,
                pos.pos_name_ru,
                pos.pos_name_en,
              ),
            }
          : null,
        contract_type: pos?.wp_type
          ? this.mapper.contractTypeLabel(pos.wp_type)
          : null,
      });
    }
    return map;
  }
}
