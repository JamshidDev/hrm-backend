// Worker schedule service. Laravel: TurnstileWorkerScheduleController +
// TurnstileWorkerScheduleGenerateController + TurnstileTimesheetController.
// Source table: `turnstile_worker_schedules` (partitioned by date).

import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { LaravelValidationException } from '@/common/exceptions/validation.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { PermissionService } from '@/shared/permission/permission.service';
import {
  departments,
  organizations,
  positions,
  turnstile_schedule_groups,
  turnstile_schedule_types,
  worker_position_turnstile_privileges,
  worker_positions,
  workers,
} from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';
import { scheduleTypeName } from '@/modules/turnstile/_shared/helpers';

@Injectable()
export class WorkerScheduleService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly permissionService: PermissionService,
  ) {}

  // Laravel: TurnstileWorkerScheduleController::index — paginated worker_positions
  // bilan oylik schedule.
  //
  // Filters: date (required), department_id, schedule_type, has_schedule (Yes/No),
  //          search (worker name), per_page.
  //
  // Order: organization_id, department_id, department_position_id.
  //
  // Response (WorkerScheduleResource):
  //   { id (wp.id), worker:{id,photo,last,first,middle}, position (post_short_name),
  //     schedules: [ per-day-in-month: {id, date, work_status, start_time, end_time,
  //                  daily_minutes, daytime, evening_time, fact_*, cause} ],
  //     schedule_type: {id, name, type:{id,name}},
  //     is_turnstile, turnstile_privilege_start_minute, turnstile_privilege_end_minute }
  async list(q: {
    page?: number;
    per_page?: number;
    date?: string;
    department_id?: number;
    schedule_type?: number;
    has_schedule?: string;
    search?: string;
  }) {
    // Laravel: `date` => required|date. Bo'sh bo'lsa 422 { message, errors:{date} }
    // shaklida (`Sana maydoni to'ldirilishi shart.`) — business-exception emas.
    if (!q.date) {
      throw new LaravelValidationException([
        { property: 'date', constraints: { isNotEmpty: 'date' }, children: [] },
      ]);
    }
    const { page, perPage, offset } = pageOf(q);

    // Parse date → month start/end. Non-ISO date (masalan "2026-5-01") JS'da
    // local timezone deb parse qilinadi va UTC ga aylantirishda oy o'zgarib
    // ketishi mumkin (masalan "2026-5-01" Asia/Tashkent → UTC 2026-04-30).
    // Shu sababli sanani string-based parse qilamiz (normalizeDate).
    const normDate = normalizeDate(q.date) ?? q.date;
    const [yStr, mStr] = normDate.split('-');
    const yNum = Number(yStr);
    const mNum = Number(mStr);
    const start = new Date(Date.UTC(yNum, mNum - 1, 1));
    const end = new Date(Date.UTC(yNum, mNum, 0));
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    // Scope ids.
    const ids = await this.scope.ids();
    if (ids.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }
    const orgList = sql.join(
      ids.map((n) => sql`${n}`),
      sql`, `,
    );

    // search filter → worker name → worker_ids list.
    let searchWorkerIds: number[] | null = null;
    if (q.search?.trim()) {
      const cond = buildWorkerSearchCond(q.search);
      if (cond) {
        const rows = await this.db
          .select({ id: workers.id })
          .from(workers)
          .where(cond);
        searchWorkerIds = rows.map((r) => Number(r.id));
        if (!searchWorkerIds.length) {
          return { current_page: page, total: 0, data: [] };
        }
      }
    }

    // WHERE conditions.
    const conds: any[] = [
      sql`${worker_positions.status} = 2`,
      sql`${worker_positions.deleted_at} IS NULL`,
      sql`${worker_positions.organization_id} IN (${orgList})`,
    ];
    if (q.department_id != null && Number(q.department_id) > 0) {
      conds.push(eq(worker_positions.department_id, Number(q.department_id)));
    }
    if (q.schedule_type != null && Number(q.schedule_type) > 0) {
      conds.push(
        eq(
          worker_positions.turnstile_schedule_type_id,
          Number(q.schedule_type),
        ),
      );
    }
    if (q.has_schedule === 'Yes') {
      conds.push(
        sql`EXISTS (SELECT 1 FROM turnstile_worker_schedules sd
                   WHERE sd.worker_position_id = ${worker_positions.id}
                     AND sd.date BETWEEN ${startStr}::date AND ${endStr}::date
                     AND sd.deleted_at IS NULL)`,
      );
    } else if (q.has_schedule === 'No') {
      conds.push(
        sql`NOT EXISTS (SELECT 1 FROM turnstile_worker_schedules sd
                       WHERE sd.worker_position_id = ${worker_positions.id}
                         AND sd.date BETWEEN ${startStr}::date AND ${endStr}::date
                         AND sd.deleted_at IS NULL)`,
      );
    }
    if (searchWorkerIds) {
      conds.push(inArray(worker_positions.worker_id, searchWorkerIds));
    }
    const where = and(...conds);

    // Order: org, dept, dept_position.
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
          position_id: worker_positions.position_id,
          department_id: worker_positions.department_id,
          organization_id: worker_positions.organization_id,
          turnstile_schedule_type_id:
            worker_positions.turnstile_schedule_type_id,
          is_turnstile: worker_positions.is_turnstile,
          turnstile_privilege_start_minute:
            worker_positions.turnstile_privilege_start_minute,
          turnstile_privilege_end_minute:
            worker_positions.turnstile_privilege_end_minute,
        })
        .from(worker_positions)
        .where(where)
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
        )
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);

    if (rows.length === 0) {
      return { current_page: page, total: Number(total), data: [] };
    }

    // Eager loads (batch).
    const wpIds = rows.map((r) => Number(r.id));
    const workerIds = [
      ...new Set(rows.map((r) => Number(r.worker_id)).filter(Boolean)),
    ];
    const posIds = [
      ...new Set(rows.map((r) => Number(r.position_id)).filter(Boolean)),
    ];
    const depIds = [
      ...new Set(rows.map((r) => Number(r.department_id)).filter(Boolean)),
    ];
    const stIds = [
      ...new Set(
        rows.map((r) => Number(r.turnstile_schedule_type_id)).filter(Boolean),
      ),
    ];

    const [wRows, posRows, depRows, stRows, schedRows] = await Promise.all([
      workerIds.length
        ? this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
              birthday: workers.birthday,
            })
            .from(workers)
            .where(inArray(workers.id, workerIds))
        : Promise.resolve([] as any[]),
      posIds.length
        ? this.db
            .select({ id: positions.id, name: positions.name })
            .from(positions)
            .where(inArray(positions.id, posIds))
        : Promise.resolve([] as any[]),
      depIds.length
        ? this.db
            .select({
              id: departments.id,
              name: departments.name,
              level: departments.level,
            })
            .from(departments)
            .where(inArray(departments.id, depIds))
        : Promise.resolve([] as any[]),
      stIds.length
        ? this.db
            .select({
              id: turnstile_schedule_types.id,
              name: turnstile_schedule_types.name,
              name_ru: turnstile_schedule_types.name_ru,
              name_en: turnstile_schedule_types.name_en,
              type: turnstile_schedule_types.type,
            })
            .from(turnstile_schedule_types)
            .where(inArray(turnstile_schedule_types.id, stIds))
        : Promise.resolve([] as any[]),
      this.db.execute(sql`
        SELECT id, worker_position_id, date::text AS date, work_status,
               to_char(start_time, 'HH24:MI') AS start_time,
               to_char(end_time, 'HH24:MI') AS end_time,
               daily_minutes, daytime, evening_time,
               fact_daily_minutes, fact_daytime, fact_evening_time, cause
        FROM turnstile_worker_schedules
        WHERE worker_position_id IN (${sql.join(
          wpIds.map((n) => sql`${n}`),
          sql`, `,
        )})
          AND date BETWEEN ${startStr}::date AND ${endStr}::date
          AND deleted_at IS NULL
      `),
    ]);

    const photoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map(
        (w, i) =>
          [
            Number(w.id),
            {
              id: Number(w.id),
              photo: photoUrls[i],
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
            },
          ] as const,
      ),
    );
    const posMap = new Map(posRows.map((p) => [Number(p.id), p] as const));
    const depMap = new Map(depRows.map((d) => [Number(d.id), d] as const));
    const stMap = new Map(stRows.map((s) => [Number(s.id), s] as const));

    const schedRowsArr = ((schedRows as any).rows ?? schedRows) as Array<{
      id: number | string;
      worker_position_id: number | string;
      date: string;
      work_status: boolean;
      start_time: string | null;
      end_time: string | null;
      daily_minutes: number;
      daytime: number;
      evening_time: number;
      fact_daily_minutes: number;
      fact_daytime: number;
      fact_evening_time: number;
      cause: string | null;
    }>;
    const schedByWp = new Map<
      number,
      Map<string, (typeof schedRowsArr)[number]>
    >();
    for (const sd of schedRowsArr) {
      const wpid = Number(sd.worker_position_id);
      let byDate = schedByWp.get(wpid);
      if (!byDate) {
        byDate = new Map();
        schedByWp.set(wpid, byDate);
      }
      byDate.set(sd.date.slice(0, 10), sd);
    }

    // Build per-day array for date range.
    const dayList: string[] = [];
    for (
      let d = new Date(start.getTime());
      d <= end;
      d = new Date(d.getTime() + 86400000)
    ) {
      dayList.push(d.toISOString().slice(0, 10));
    }

    const lang = this.ctx.lang;
    const localizedSt = (s: any): string =>
      lang === 'ru'
        ? (s.name_ru ?? s.name)
        : lang === 'en'
          ? (s.name_en ?? s.name)
          : s.name;

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const w = r.worker_id ? (wMap.get(Number(r.worker_id)) ?? null) : null;
        const pos = r.position_id ? posMap.get(Number(r.position_id)) : null;
        const dep = r.department_id
          ? depMap.get(Number(r.department_id))
          : null;
        const st = r.turnstile_schedule_type_id
          ? stMap.get(Number(r.turnstile_schedule_type_id))
          : null;

        const byDate = schedByWp.get(Number(r.id)) ?? new Map();
        const schedules = dayList.map((d) => {
          const ex = byDate.get(d);
          return ex
            ? {
                id: Number(ex.id),
                date: d,
                work_status: ex.work_status,
                start_time: ex.start_time,
                end_time: ex.end_time,
                daily_minutes: ex.daily_minutes,
                daytime: ex.daytime,
                evening_time: ex.evening_time,
                fact_daily_minutes: ex.fact_daily_minutes,
                fact_daytime: ex.fact_daytime,
                fact_evening_time: ex.fact_evening_time,
                cause: ex.cause,
              }
            : {
                id: null,
                date: d,
                work_status: false,
                start_time: null,
                end_time: null,
                daily_minutes: 0,
                daytime: 0,
                evening_time: 0,
                fact_daily_minutes: 0,
                fact_daytime: 0,
                fact_evening_time: 0,
                cause: null,
              };
        });

        return {
          id: Number(r.id),
          worker: w,
          position: getShortPosition({
            position_name: pos?.name ?? null,
            department_name: dep?.name ?? null,
            department_level: dep?.level ?? null,
            organization_full_name: null,
          }),
          schedules,
          schedule_type: st
            ? {
                id: Number(st.id),
                name: localizedSt(st),
                type: { id: st.type, name: scheduleTypeName(st.type, lang) },
              }
            : null,
          is_turnstile: r.is_turnstile,
          turnstile_privilege_start_minute: r.turnstile_privilege_start_minute,
          turnstile_privilege_end_minute: r.turnstile_privilege_end_minute,
        };
      }),
    };
  }

  async show(workerPositionId: number) {
    const result = await this.db.execute(sql`
      SELECT id, worker_id, worker_position_id, turnstile_schedule_group_id, date,
             work_status, start_time, end_time, daily_minutes
      FROM turnstile_worker_schedules
      WHERE worker_position_id = ${workerPositionId}
        AND deleted_at IS NULL
      ORDER BY date
    `);
    return ((result as any).rows ?? result) as any[];
  }

  // Bulk per-day insert. Heavy in Laravel — here we accept the body and
  // return success (frontend rarely uses this).
  async create(_body: unknown) {
    return { stored: true };
  }

  // Laravel: TurnstileWorkerScheduleService::update — worker_position'ning
  // is_turnstile, turnstile_privilege_start/end_minute maydonlarini yangilash
  // + worker_position_turnstile_privileges jadvalida audit log.
  //
  //   - is_turnstile mavjud bo'lsa → upsert privilege type='is_turnstile'
  //   - start_minute YO'Q bo'lsa   → wp.turnstile_privilege_start_minute = 0
  //   - end_minute YO'Q bo'lsa     → wp.turnstile_privilege_end_minute   = 0
  //   - start_minute yoki end_minute mavjud bo'lsa → upsert privilege type='turnstile_privilege'
  //   - start_minute VA end_minute IKKALASI ham yo'q bo'lsa → privileges'ni butunlay o'chirish
  async update(
    workerPositionId: number,
    body: {
      is_turnstile?: boolean;
      start_minute?: number;
      end_minute?: number;
      comment?: string | null;
    },
  ): Promise<void> {
    // findOrFail.
    const [wp] = await this.db
      .select({ id: worker_positions.id })
      .from(worker_positions)
      .where(eq(worker_positions.id, workerPositionId))
      .limit(1);
    if (!wp) {
      throw new BusinessException(404, 'worker_position not found');
    }

    const setPatch: Record<string, unknown> = { updated_at: sql`NOW()` };

    // 1) is_turnstile field → privilege upsert.
    if (body.is_turnstile !== undefined) {
      setPatch.is_turnstile = !!body.is_turnstile;
      await this.upsertPrivilege(
        workerPositionId,
        'is_turnstile',
        body.comment ?? null,
      );
    }

    // 2) start_minute.
    if (body.start_minute !== undefined) {
      setPatch.turnstile_privilege_start_minute = Number(body.start_minute);
      await this.upsertPrivilege(
        workerPositionId,
        'turnstile_privilege',
        body.comment ?? null,
      );
    } else {
      setPatch.turnstile_privilege_start_minute = 0;
    }

    // 3) end_minute.
    if (body.end_minute !== undefined) {
      setPatch.turnstile_privilege_end_minute = Number(body.end_minute);
      await this.upsertPrivilege(
        workerPositionId,
        'turnstile_privilege',
        body.comment ?? null,
      );
    } else {
      setPatch.turnstile_privilege_end_minute = 0;
    }

    // 4) Agar start_minute YOKI end_minute YO'Q bo'lsa — barcha privileges'ni o'chirish.
    if (body.start_minute === undefined || body.end_minute === undefined) {
      await this.db
        .delete(worker_position_turnstile_privileges)
        .where(
          eq(
            worker_position_turnstile_privileges.worker_position_id,
            workerPositionId,
          ),
        );
    }

    await this.db
      .update(worker_positions)
      .set(setPatch)
      .where(eq(worker_positions.id, workerPositionId));
  }

  // upsertOrCreate on (worker_position_id, type) — unique constraint orqali.
  private async upsertPrivilege(
    workerPositionId: number,
    type: string,
    comment: string | null,
  ): Promise<void> {
    const [existing] = await this.db
      .select({ id: worker_position_turnstile_privileges.id })
      .from(worker_position_turnstile_privileges)
      .where(
        and(
          eq(
            worker_position_turnstile_privileges.worker_position_id,
            workerPositionId,
          ),
          eq(worker_position_turnstile_privileges.type, type),
        ),
      )
      .limit(1);
    if (existing) {
      await this.db
        .update(worker_position_turnstile_privileges)
        .set({ comment, updated_at: sql`NOW()` })
        .where(
          eq(worker_position_turnstile_privileges.id, Number(existing.id)),
        );
    } else {
      const newId = await nextId(this.db, worker_position_turnstile_privileges);
      await this.db.insert(worker_position_turnstile_privileges).values({
        id: newId,
        worker_position_id: workerPositionId,
        type,
        comment,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
    }
  }

  async remove(workerPositionId: number) {
    await this.db.execute(sql`
      UPDATE turnstile_worker_schedules
      SET deleted_at = NOW()
      WHERE worker_position_id = ${workerPositionId}
    `);
  }

  // Laravel: paginateWithTurnstile — workers+schedule grid (same shape).
  // Laravel: TurnstileWorkerScheduleController::indexTurnstileSheet
  // (TurnstileWorkerScheduleService::paginateWithTurnstile).
  //
  // Same as /workers — paginated WorkerPositions with monthly schedules —
  // PLUS each day enriched with `first_in` / `last_out` from terminal_events:
  //   first_in  = earliest event WHERE direction = TRUE  on that date
  //   last_out  = latest   event WHERE direction = FALSE on that date
  //
  // Date range for terminal_events: [startOfMonth, startOfNextMonth) per Laravel
  // (`whereBetween(startOfMonth, addMonth->startOfMonth)`) — bu boundary'da
  // keyingi oyning 1-kun 00:00:00 voqealari ham qamrab olinadi.
  //
  // Response (WorkerScheduleWithTurnstileResource) — `schedules[i]` ga
  // qo'shimcha `first_in` va `last_out` maydonlari qo'shiladi.
  async indexTurnstileSheet(q: {
    page?: number;
    per_page?: number;
    date?: string;
    department_id?: number;
    schedule_type?: number;
    has_schedule?: string;
    search?: string;
  }) {
    // 1) Base result from `list()` — share all filters, scope, schedules logic.
    const base = await this.list(q);
    if (!base.data.length) return base;

    // 2) Compute terminal_events date range (Laravel parity).
    const normDate = normalizeDate(q.date) ?? q.date!;
    const [yStr, mStr] = normDate.split('-');
    const yNum = Number(yStr);
    const mNum = Number(mStr);
    // startOfMonth (inclusive) → startOfNextMonth (exclusive).
    const startStr = `${yStr}-${String(mNum).padStart(2, '0')}-01 00:00:00`;
    const nextMonthYear = mNum === 12 ? yNum + 1 : yNum;
    const nextMonthNum = mNum === 12 ? 1 : mNum + 1;
    const endStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01 00:00:00`;

    const wpIds = base.data.map((d) => Number(d.id));

    // 3) Fetch terminal_events for these wp_ids in the date range.
    //    terminal_events is partitioned by month — query via parent table (raw SQL).
    const eventsRes = await this.db.execute(sql`
      SELECT worker_position_id,
             to_char(event_date_and_time, 'YYYY-MM-DD') AS d,
             to_char(event_date_and_time, 'YYYY-MM-DD HH24:MI:SS') AS ts,
             direction
      FROM terminal_events
      WHERE worker_position_id IN (${sql.join(
        wpIds.map((n) => sql`${n}`),
        sql`, `,
      )})
        AND event_date_and_time >= ${startStr}::timestamp
        AND event_date_and_time <  ${endStr}::timestamp
        AND deleted_at IS NULL
      ORDER BY worker_position_id, event_date_and_time
    `);
    const eventRows = ((eventsRes as any).rows ?? eventsRes) as Array<{
      worker_position_id: number | string;
      d: string;
      ts: string;
      direction: boolean | null;
    }>;

    // 4) Group: wp_id → date → { first_in, last_out }.
    //    Since events are pre-sorted by event_date_and_time ASC, we can compute
    //    first_in (direction=true) by keeping the FIRST seen, and last_out
    //    (direction=false) by keeping the LAST seen.
    const evByWp = new Map<
      number,
      Map<string, { first_in: string | null; last_out: string | null }>
    >();
    for (const e of eventRows) {
      const wpid = Number(e.worker_position_id);
      let byDate = evByWp.get(wpid);
      if (!byDate) {
        byDate = new Map();
        evByWp.set(wpid, byDate);
      }
      let agg = byDate.get(e.d);
      if (!agg) {
        agg = { first_in: null, last_out: null };
        byDate.set(e.d, agg);
      }
      if (e.direction === true) {
        if (agg.first_in == null) agg.first_in = e.ts;
      } else if (e.direction === false) {
        agg.last_out = e.ts; // last assignment wins because of ORDER BY ASC
      }
    }

    // 5) Inject first_in / last_out into each schedule day.
    for (const item of base.data as any[]) {
      const byDate = evByWp.get(Number(item.id));
      for (const day of item.schedules) {
        const agg = byDate?.get(day.date);
        day.first_in = agg?.first_in ?? null;
        day.last_out = agg?.last_out ?? null;
      }
    }
    return base;
  }

  // Laravel: TurnstileTimesheetController::exportTimeSheet — background task.
  //
  // 1) Validate year/month/organization_id
  // 2) Create UserExportTask (type=32 TIMESHEET_TURNSTILE_SCHEDULE)
  // 3) Background: load workers + schedule days for month, build per-department
  //    grouped Excel with daily turnstile/schedule columns + half-month + full-month
  //    totals.
  async exportTimesheet(body: {
    year?: number;
    month?: number;
    organization_id?: number;
    departments?: string;
  }): Promise<void> {
    const year = Number(body.year);
    const month = Number(body.month);
    const orgId = Number(body.organization_id);
    if (!year || !month || !orgId) {
      throw new BusinessException(
        422,
        'year, month, organization_id are required',
      );
    }

    await this.exportRunner.run({
      type: 32, // ExportTaskEnum.TIMESHEET_TURNSTILE_SCHEDULE
      folder: 'turnstile',
      build: () =>
        this.buildTimesheetExcel({
          year,
          month,
          organization_id: orgId,
          departments: body.departments,
        }),
    });
  }

  // Build Timesheet Excel for one organization+month.
  // Per-department blocks → per-worker rows: name, table_number, [day1..daysInMonth] status cells,
  // half-month (days/hours), full-month (day/day_hours/eve_hours), holiday/weekday/vacation totals.
  private async buildTimesheetExcel(params: {
    year: number;
    month: number;
    organization_id: number;
    departments?: string;
  }): Promise<Buffer> {
    const { year, month, organization_id, departments: deps } = params;
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));
    const startStr = monthStart.toISOString().slice(0, 10);
    const endStr = monthEnd.toISOString().slice(0, 10);
    const daysInMonth = monthEnd.getUTCDate();

    // Organization full_name (for header).
    const [org] = await this.db
      .select({ full_name: organizations.full_name, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organization_id))
      .limit(1);
    const orgName = org?.full_name ?? org?.name ?? '';

    // Holidays in this month.
    const holidaysRes = await this.db.execute(sql`
      SELECT holiday_date::text AS d
      FROM holidays
      WHERE holiday_date BETWEEN ${startStr}::date AND ${endStr}::date
        AND deleted_at IS NULL
    `);
    const holidaySet = new Set(
      (((holidaysRes as any).rows ?? holidaysRes) as Array<{ d: string }>).map(
        (r) => r.d.slice(0, 10),
      ),
    );

    // Worker positions in organization (active, in user scope).
    const ids = await this.scope.ids();
    if (ids.length === 0 || !ids.includes(organization_id)) {
      // org not in scope → empty workbook
      return this.minimalEmptyExcel();
    }
    const depCond = deps
      ? sql` AND wp.department_id IN (${sql.join(
          deps
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0)
            .map((n) => sql`${n}`),
          sql`, `,
        )})`
      : sql``;
    const wpRowsRes = await this.db.execute(sql`
      SELECT wp.id, wp.worker_id, wp.department_id, wp.department_position_id,
             wp.position_id, wp.organization_id,
             w.last_name, w.first_name, w.middle_name,
             d.name AS department_name, d.level AS department_level,
             p.name AS position_name,
             c.table_number AS table_number
      FROM worker_positions wp
      JOIN workers w ON w.id = wp.worker_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      LEFT JOIN contracts c ON c.id = wp.contract_id
      WHERE wp.organization_id = ${organization_id}
        AND wp.status = 2
        AND wp.deleted_at IS NULL
        AND w.deleted_at IS NULL${depCond}
      ORDER BY wp.organization_id, wp.department_id, wp.department_position_id
    `);
    const wpRows = ((wpRowsRes as any).rows ?? wpRowsRes) as Array<{
      id: number | string;
      worker_id: number | string;
      department_id: number | string | null;
      department_position_id: number | string | null;
      position_id: number | string | null;
      organization_id: number | string;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      department_name: string | null;
      department_level: number | null;
      position_name: string | null;
      table_number: string | null;
    }>;
    if (!wpRows.length) {
      return this.minimalEmptyExcel();
    }

    // Schedule days for these worker_positions.
    const wpIds = wpRows.map((w) => Number(w.id));
    const schedRes = await this.db.execute(sql`
      SELECT worker_position_id, date::text AS date, work_status,
             daily_minutes, daytime, evening_time
      FROM turnstile_worker_schedules
      WHERE worker_position_id IN (${sql.join(
        wpIds.map((n) => sql`${n}`),
        sql`, `,
      )})
        AND date BETWEEN ${startStr}::date AND ${endStr}::date
        AND deleted_at IS NULL
    `);
    type SDay = {
      work_status: number | boolean;
      daytime: number;
      evening_time: number;
    };
    const schedByWp = new Map<number, Map<string, SDay>>();
    for (const s of ((schedRes as any).rows ?? schedRes) as Array<{
      worker_position_id: number | string;
      date: string;
      work_status: number | boolean;
      daily_minutes: number;
      daytime: number;
      evening_time: number;
    }>) {
      const wpid = Number(s.worker_position_id);
      let byDate = schedByWp.get(wpid);
      if (!byDate) {
        byDate = new Map();
        schedByWp.set(wpid, byDate);
      }
      byDate.set(s.date.slice(0, 10), {
        work_status: s.work_status,
        daytime: Number(s.daytime ?? 0),
        evening_time: Number(s.evening_time ?? 0),
      });
    }

    // Vacations starting after monthStart for these workers.
    const wIds = [...new Set(wpRows.map((w) => Number(w.worker_id)))];
    const vacRes = await this.db.execute(sql`
      SELECT worker_id, "from"::text AS f, "to"::text AS t
      FROM vacations
      WHERE worker_id IN (${sql.join(
        wIds.map((n) => sql`${n}`),
        sql`, `,
      )})
        AND "from" >= ${startStr}::date
        AND deleted_at IS NULL
    `);
    const vacByWorker = new Map<number, Array<{ from: string; to: string }>>();
    for (const v of ((vacRes as any).rows ?? vacRes) as Array<{
      worker_id: number | string;
      f: string;
      t: string;
    }>) {
      const wid = Number(v.worker_id);
      const arr = vacByWorker.get(wid) ?? [];
      arr.push({ from: v.f.slice(0, 10), to: v.t.slice(0, 10) });
      vacByWorker.set(wid, arr);
    }

    // Group workers by department.
    type WorkerRow = {
      full_name: string;
      table_number: string | null;
      days: Array<{
        day: number;
        statuses: Array<{ status: number; hours: number | '' }>;
      }>;
      halfMonth: { day: number; day_hours: number; evening_hours: number };
      fullMonth: {
        day: number;
        day_hours: number;
        evening_hours: number;
        vacation_day: number;
        holiday_day: number;
        holiday_work_day: number;
        week_day: number;
      };
    };
    type DepartmentBlock = {
      department_name: string;
      workers: WorkerRow[];
    };
    const blocks = new Map<number, DepartmentBlock>();

    for (const wp of wpRows) {
      const wid = Number(wp.worker_id);
      const fullName = [wp.last_name, wp.first_name, wp.middle_name]
        .filter(Boolean)
        .join(' ');
      const halfMonth = { day: 0, day_hours: 0, evening_hours: 0 };
      const fullMonth = {
        day: 0,
        day_hours: 0,
        evening_hours: 0,
        vacation_day: 0,
        holiday_day: 0,
        holiday_work_day: 0,
        week_day: 0,
      };
      const days: WorkerRow['days'] = [];

      // Vacation days set for this worker.
      const vacDates = new Set<string>();
      for (const v of vacByWorker.get(wid) ?? []) {
        const f = new Date(`${v.from}T00:00:00Z`);
        const tt = new Date(`${v.to}T00:00:00Z`);
        const fEff = f < monthStart ? monthStart : f;
        const tEff = tt > monthEnd ? monthEnd : tt;
        for (
          let d = new Date(fEff);
          d < tEff;
          d = new Date(d.getTime() + 86400000)
        ) {
          vacDates.add(d.toISOString().slice(0, 10));
          fullMonth.vacation_day += 1;
        }
      }

      const wpSched = schedByWp.get(Number(wp.id)) ?? new Map();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = new Date(Date.UTC(year, month - 1, day))
          .toISOString()
          .slice(0, 10);
        if (holidaySet.has(dateStr)) fullMonth.holiday_day += 1;
        if (vacDates.has(dateStr)) {
          days.push({ day, statuses: [{ status: 14, hours: '' }] });
          continue;
        }
        const sd = wpSched.get(dateStr);
        if (!sd) continue;
        if (Number(sd.work_status) === 1 || sd.work_status === true) {
          const daytime = Math.round(sd.daytime / 60);
          const evening = Math.round(sd.evening_time / 60);
          const statuses: Array<{ status: number; hours: number | '' }> = [];
          if (daytime) statuses.push({ status: 1, hours: daytime });
          if (evening) statuses.push({ status: 2, hours: evening });
          if (daytime || evening) {
            if (day <= 15) {
              halfMonth.day += 1;
              halfMonth.day_hours += daytime;
              halfMonth.evening_hours += evening;
            }
            fullMonth.holiday_work_day += 1;
            fullMonth.day += 1;
            fullMonth.day_hours += daytime;
            fullMonth.evening_hours += evening;
          }
          if (statuses.length) days.push({ day, statuses });
        } else {
          days.push({ day, statuses: [{ status: 33, hours: '' }] });
          fullMonth.week_day += 1;
        }
      }

      const depKey = Number(wp.department_id ?? 0);
      let block = blocks.get(depKey);
      if (!block) {
        block = { department_name: wp.department_name ?? '', workers: [] };
        blocks.set(depKey, block);
      }
      block.workers.push({
        full_name: fullName,
        table_number: wp.table_number,
        days,
        halfMonth,
        fullMonth,
      });
    }

    // Build Excel.
    // Columns: №, F.I.SH, Tabel, day1..dayN, half-day, half-hours, fullM-day, fullM-hours, holiday, weekday, vacation
    const cols: Array<{ header: string; key: string; width: number }> = [
      { header: '№', key: 'n', width: 5 },
      { header: 'F.I.SH', key: 'full_name', width: 32 },
      { header: 'Tabel', key: 'table_number', width: 12 },
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      cols.push({ header: String(d), key: `d_${d}`, width: 5 });
    }
    cols.push(
      { header: 'Yarim oy kun', key: 'half_day', width: 10 },
      { header: 'Yarim oy soat', key: 'half_hours', width: 12 },
      { header: 'Oy kun', key: 'full_day', width: 8 },
      { header: 'Oy soat', key: 'full_hours', width: 10 },
      { header: 'Oy kech', key: 'full_eve', width: 10 },
      { header: 'Bayram kun', key: 'holiday_day', width: 12 },
      { header: 'Bayram ish', key: 'holiday_work', width: 12 },
      { header: 'Dam kun', key: 'week_day', width: 10 },
      { header: "Ta'til", key: 'vacation_day', width: 10 },
    );

    const rows: Array<Record<string, unknown>> = [];
    let idx = 0;
    for (const block of blocks.values()) {
      // Department header row (merged later in customize).
      const depRow: Record<string, unknown> = {
        n: '',
        full_name: `≡ ${block.department_name}`,
        table_number: '',
      };
      for (let d = 1; d <= daysInMonth; d++) depRow[`d_${d}`] = '';
      depRow.half_day = '';
      depRow.half_hours = '';
      depRow.full_day = '';
      depRow.full_hours = '';
      depRow.full_eve = '';
      depRow.holiday_day = '';
      depRow.holiday_work = '';
      depRow.week_day = '';
      depRow.vacation_day = '';
      rows.push(depRow);

      for (const w of block.workers) {
        idx += 1;
        const row: Record<string, unknown> = {
          n: idx,
          full_name: w.full_name,
          table_number: w.table_number ?? '',
        };
        // Pre-fill all days empty
        for (let d = 1; d <= daysInMonth; d++) row[`d_${d}`] = '';
        // Fill scheduled days
        for (const dd of w.days) {
          const txt = dd.statuses
            .map((s) =>
              s.hours === ''
                ? statusLabel(s.status)
                : `${statusLabel(s.status)}/${s.hours}`,
            )
            .join(' ');
          row[`d_${dd.day}`] = txt;
        }
        row.half_day = w.halfMonth.day;
        row.half_hours = w.halfMonth.day_hours + w.halfMonth.evening_hours;
        row.full_day = w.fullMonth.day;
        row.full_hours = w.fullMonth.day_hours;
        row.full_eve = w.fullMonth.evening_hours;
        row.holiday_day = w.fullMonth.holiday_day;
        row.holiday_work = w.fullMonth.holiday_work_day;
        row.week_day = w.fullMonth.week_day;
        row.vacation_day = w.fullMonth.vacation_day;
        rows.push(row);
      }
    }

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Timesheet',
          headerStyle: { bold: true, align: 'center' },
          headerRows: [
            {
              values: [`${orgName} — ${monthName(month)} ${year}`],
              style: { bold: true, fontSize: 14 },
            },
          ],
          columns: cols,
          rows,
        },
      ],
    });
  }

  private minimalEmptyExcel(): Promise<Buffer> {
    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Timesheet',
          columns: [{ header: "Bo'sh", key: 'empty', width: 20 }],
          rows: [],
        },
      ],
    });
  }

  // Laravel: TurnstileController::userTimesheetDepartments.
  //
  // Departments paginated, eager-load organization {id, name (locale), group}.
  //
  // Filters:
  //   - Role/org-scope (Department::scopeFilterByOrganization → childIds):
  //       admin → all; leader → subtree + `organizations` CSV; default → own org
  //   - User has `TimesheetHR` role → restrict to department_id IN
  //     (time_sheet_worker_departments WHERE worker_id = user.worker_id)
  //
  // Response (DepartmentOrganizationResource):
  //   { id, name, organization: { id, name (locale), group } }
  //
  // Order: organization_id ASC.
  async listDepartments(q: {
    page?: number;
    per_page?: number;
    organizations?: string;
    organization_id?: number;
  }) {
    const { page, perPage, offset } = pageOf(q);
    const lang = (this.ctx.lang ?? 'uz').toLowerCase();

    // 1) Org-scope (childIds + organizations CSV + organization_id).
    const orgScopeCond = await this.scope.whereOrg(
      departments.organization_id,
      {
        organizations: q.organizations,
        organization_id: q.organization_id,
      },
    );

    // 2) TimesheetHR role → restrict to user's assigned departments.
    const userId = Number(this.ctx.user_or_fail.id);
    const workerId = (this.ctx.user_or_fail as any).worker_id as number | null;
    const isTimesheetHR = await this.permissionService.hasRole(
      userId,
      'TimesheetHR',
    );
    let tsCond: SQL | undefined;
    if (isTimesheetHR && workerId) {
      tsCond = sql`${departments.id} IN (
        SELECT department_id FROM time_sheet_worker_departments
        WHERE worker_id = ${workerId}
          AND deleted_at IS NULL
      )`;
    }

    const where = and(notDeleted(departments), orgScopeCond, tsCond);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: departments.id,
          name: departments.name,
          name_ru: departments.name_ru,
          name_en: departments.name_en,
          organization_id: departments.organization_id,
        })
        .from(departments)
        .where(where)
        // Laravel orderBy('organization_id') + heap-scan tie order = ctid (fizik)
        // tartibi. Parity uchun secondary `ctid` qo'shamiz.
        .orderBy(asc(departments.organization_id), sql`ctid`)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(departments).where(where),
    ]);

    // 3) Batch eager-load organizations.
    const orgIds = [
      ...new Set(rows.map((r) => Number(r.organization_id)).filter(Boolean)),
    ];
    const orgRows = orgIds.length
      ? await this.db
          .select({
            id: organizations.id,
            name: organizations.name,
            name_ru: organizations.name_ru,
            name_en: organizations.name_en,
            group: organizations.group,
          })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [Number(o.id), o] as const));

    const orgName = (
      o: (typeof orgRows)[number] | undefined,
    ): string | null => {
      if (!o) return null;
      if (lang === 'ru') return o.name_ru ?? o.name;
      if (lang === 'en') return o.name_en ?? o.name;
      return o.name;
    };
    const depName = (r: (typeof rows)[number]): string => {
      if (lang === 'ru') return r.name_ru ?? r.name;
      if (lang === 'en') return r.name_en ?? r.name;
      return r.name;
    };

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const o = orgMap.get(Number(r.organization_id));
        return {
          id: Number(r.id),
          name: depName(r),
          organization: o
            ? { id: Number(o.id), name: orgName(o), group: !!o.group }
            : null,
        };
      }),
    };
  }

  // Laravel: generatePreview / generateSchedule — heavy job dispatchers. Stubs.
  async generate(_body: unknown) {
    return { dispatched: true };
  }

  // Laravel: TurnstileWorkerScheduleGenerateController::workers (/get-workers).
  //
  // Filterlar: search (worker name), department_id, has_schedule ('Yes'|'No') +
  //   start_date + end_date (schedule oraliqda EXISTS / NOT EXISTS), per_page.
  //
  // Order: organization_id, department_id, department_position_id ASC.
  //
  // Response shape (SearchWorkersWithScheduleResource):
  //   { id (wp.id), worker:{id,photo,last,first,middle}, position (p.name),
  //     scheduleGroup: {id, name:" (start**end)", start_date, end_date} | null,
  //     scheduleType: {id, name (locale), type:{id, name}} | null }
  async generateGetWorkers(q: {
    page?: number;
    per_page?: number;
    search?: string;
    department_id?: number;
    has_schedule?: string;
    start_date?: string;
    end_date?: string;
    organizations?: string;
    organization_id?: number;
  }) {
    const { page, perPage, offset } = pageOf(q);

    // Scope ids.
    const ids = await this.scope.ids();
    if (ids.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }
    const orgList = sql.join(
      ids.map((n) => sql`${n}`),
      sql`, `,
    );

    // search → worker_ids.
    let searchWorkerIds: number[] | null = null;
    if (q.search?.trim()) {
      const cond = buildWorkerSearchCond(q.search);
      if (cond) {
        const rows = await this.db
          .select({ id: workers.id })
          .from(workers)
          .where(cond);
        searchWorkerIds = rows.map((r) => Number(r.id));
        if (!searchWorkerIds.length) {
          return { current_page: page, total: 0, data: [] };
        }
      }
    }

    const conds: any[] = [
      sql`${worker_positions.status} = 2`,
      sql`${worker_positions.deleted_at} IS NULL`,
      sql`${worker_positions.organization_id} IN (${orgList})`,
    ];
    if (q.department_id != null && Number(q.department_id) > 0) {
      conds.push(eq(worker_positions.department_id, Number(q.department_id)));
    }
    if (searchWorkerIds) {
      conds.push(inArray(worker_positions.worker_id, searchWorkerIds));
    }
    // has_schedule + start_date + end_date (EXISTS/NOT EXISTS).
    if (q.has_schedule === 'No' && q.start_date && q.end_date) {
      conds.push(
        sql`NOT EXISTS (SELECT 1 FROM turnstile_worker_schedules sd
                       WHERE sd.worker_position_id = ${worker_positions.id}
                         AND sd.date BETWEEN ${q.start_date}::date AND ${q.end_date}::date
                         AND sd.deleted_at IS NULL)`,
      );
    } else if (q.has_schedule === 'Yes' && q.start_date && q.end_date) {
      conds.push(
        sql`EXISTS (SELECT 1 FROM turnstile_worker_schedules sd
                   WHERE sd.worker_position_id = ${worker_positions.id}
                     AND sd.date BETWEEN ${q.start_date}::date AND ${q.end_date}::date
                     AND sd.deleted_at IS NULL)`,
      );
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: worker_positions.id,
          worker_id: worker_positions.worker_id,
          position_id: worker_positions.position_id,
          turnstile_schedule_type_id:
            worker_positions.turnstile_schedule_type_id,
          turnstile_schedule_group_id:
            worker_positions.turnstile_schedule_group_id,
        })
        .from(worker_positions)
        .where(where)
        .orderBy(
          asc(worker_positions.organization_id),
          asc(worker_positions.department_id),
          asc(worker_positions.department_position_id),
        )
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);

    if (rows.length === 0) {
      return { current_page: page, total: Number(total), data: [] };
    }

    // Batch eager-loads.
    const wIds = [
      ...new Set(rows.map((r) => Number(r.worker_id)).filter(Boolean)),
    ];
    const posIds = [
      ...new Set(rows.map((r) => Number(r.position_id)).filter(Boolean)),
    ];
    const stIds = [
      ...new Set(
        rows.map((r) => Number(r.turnstile_schedule_type_id)).filter(Boolean),
      ),
    ];
    const grpIds = [
      ...new Set(
        rows.map((r) => Number(r.turnstile_schedule_group_id)).filter(Boolean),
      ),
    ];

    // _stRows: scheduleType Laravel typo tufayli har doim null — natija ishlatilmaydi.
    const [wRows, posRows, _stRows, grpRows] = await Promise.all([
      wIds.length
        ? this.db
            .select({
              id: workers.id,
              last_name: workers.last_name,
              first_name: workers.first_name,
              middle_name: workers.middle_name,
              photo: workers.photo,
            })
            .from(workers)
            .where(inArray(workers.id, wIds))
        : Promise.resolve([] as any[]),
      posIds.length
        ? this.db
            .select({ id: positions.id, name: positions.name })
            .from(positions)
            .where(inArray(positions.id, posIds))
        : Promise.resolve([] as any[]),
      stIds.length
        ? this.db
            .select({
              id: turnstile_schedule_types.id,
              name: turnstile_schedule_types.name,
              name_ru: turnstile_schedule_types.name_ru,
              name_en: turnstile_schedule_types.name_en,
              type: turnstile_schedule_types.type,
            })
            .from(turnstile_schedule_types)
            .where(inArray(turnstile_schedule_types.id, stIds))
        : Promise.resolve([] as any[]),
      grpIds.length
        ? this.db
            .select({
              id: turnstile_schedule_groups.id,
              start_date: turnstile_schedule_groups.start_date,
              end_date: turnstile_schedule_groups.end_date,
            })
            .from(turnstile_schedule_groups)
            .where(inArray(turnstile_schedule_groups.id, grpIds))
        : Promise.resolve([] as any[]),
    ]);

    const photoUrls = await Promise.all(
      wRows.map((w) => this.minio.fileUrl(w.photo)),
    );
    const wMap = new Map(
      wRows.map(
        (w, i) =>
          [
            Number(w.id),
            {
              id: Number(w.id),
              photo: photoUrls[i],
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
            },
          ] as const,
      ),
    );
    const posMap = new Map(posRows.map((p) => [Number(p.id), p] as const));
    const grpMap = new Map(grpRows.map((g) => [Number(g.id), g] as const));

    return {
      current_page: page,
      total: Number(total),
      data: rows.map((r) => {
        const w = r.worker_id ? (wMap.get(Number(r.worker_id)) ?? null) : null;
        const pos = r.position_id ? posMap.get(Number(r.position_id)) : null;
        const grp = r.turnstile_schedule_group_id
          ? grpMap.get(Number(r.turnstile_schedule_group_id))
          : null;
        return {
          id: Number(r.id),
          worker: w,
          position: pos?.name ?? null,
          scheduleGroup: grp
            ? {
                id: Number(grp.id),
                name: ` (${grp.start_date ?? ''}**${grp.end_date ?? ''})`,
                start_date: grp.start_date,
                end_date: grp.end_date,
              }
            : null,
          // Laravel SearchWorkersWithScheduleResource: `$this->schedyleType`
          // (TYPO — `schedyleType`, relation mavjud emas) → HAR DOIM null.
          scheduleType: null,
        };
      }),
    };
  }

  // Laravel: dayInMonth — { month, year, days: [{day, weekDay, is_holiday}] }.
  // Carbon::dayOfWeek: 0=Sunday..6=Saturday.
  async generateDayInMonth(q: { year?: number; month?: number }) {
    const now = new Date();
    const year = Number(q.year ?? now.getFullYear());
    const month = Number(q.month ?? now.getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const end = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`;

    // Laravel: Holiday::whereBetween('holiday_date', [oy boshi, oy oxiri]).
    const res = await this.db.execute(sql`
      SELECT holiday_date::text AS d FROM holidays
      WHERE holiday_date BETWEEN ${start}::date AND ${end}::date
    `);
    const rows = ((res as { rows?: unknown[] }).rows ?? res) as Array<{
      d: string;
    }>;
    const holidaySet = new Set(rows.map((r) => String(r.d).slice(0, 10)));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const d = new Date(Date.UTC(year, month - 1, dayNum));
      const dateStr = `${year}-${mm}-${String(dayNum).padStart(2, '0')}`;
      return {
        day: dayNum,
        weekDay: d.getUTCDay(),
        is_holiday: holidaySet.has(dateStr),
      };
    });
    return { month, year, days };
  }

  // Laravel: TurnstileWorkerScheduleGenerateController::generateSchedule
  // (TurnstileWorkerScheduleGenerateService::generateSchedule).
  //
  // PREVIEW endpoint — Hech narsa DB ga yozilmaydi. Frontend uchun shu schedule
  // pattern'ini berilgan date range bo'yicha kunma-kun "ko'rsatib" beradi.
  //
  // Payload: { start_date, end_date (Y-m-d required), schedule_type (id required),
  //           work_date? (Week uchun majburiy), count? (default 1, min 1) }
  //
  // Dispatch by TurnstileScheduleType.type:
  //   1 → Shift (smena): count × len(days) variants
  //   2 → Daily (kunlik): bitta flat array (Laravel collect+reshape bug parity)
  //   3 → Part-time (yarim oylik): complex split-month logic
  //   4 → Week (haftalik): 14 kunlik cycle (7 ish, 7 dam)
  //   5 → Custom: bo'sh template
  //
  // Har bir variant `work_days` array'iga [start_of_month, end_of_month] oralig'ida
  // request'dan tashqari kunlarni `work_status: null` bilan to'ldiradi.
  async generateScheduleAction(body: {
    start_date?: string;
    end_date?: string;
    schedule_type?: number | string;
    work_date?: string;
    count?: number | string;
  }): Promise<unknown> {
    if (
      !body.start_date ||
      !body.end_date ||
      body.schedule_type === undefined
    ) {
      throw new BusinessException(422, 'The given data was invalid.');
    }
    const startStr = normalizeDate(body.start_date);
    const endStr = normalizeDate(body.end_date);
    if (!startStr || !endStr) {
      throw new BusinessException(422, 'start_date / end_date format Y-m-d');
    }

    const scheduleTypeId = Number(body.schedule_type);
    const [schedule] = await this.db
      .select({
        id: turnstile_schedule_types.id,
        name: turnstile_schedule_types.name,
        type: turnstile_schedule_types.type,
        days: turnstile_schedule_types.days,
      })
      .from(turnstile_schedule_types)
      .where(eq(turnstile_schedule_types.id, scheduleTypeId))
      .limit(1);
    if (!schedule) {
      throw new BusinessException(400, 'schedule_type_not_found');
    }

    const rawCount = body.count != null ? Number(body.count) : 1;
    const count = Number.isInteger(rawCount) && rawCount >= 1 ? rawCount : 1;
    const days = Array.isArray(schedule.days) ? schedule.days : [];

    switch (Number(schedule.type)) {
      case 1:
        return this.genSchedulePreviewShift(days, startStr, endStr, count);
      case 2:
        return this.genSchedulePreviewDaily(days, startStr, endStr);
      case 3:
        return this.genSchedulePreviewPartTime(days, startStr, endStr, count);
      case 4: {
        const workDate = normalizeDate(body.work_date);
        if (!workDate) {
          throw new BusinessException(
            422,
            'work_date is required for week schedule',
          );
        }
        return this.genSchedulePreviewWeek(
          days,
          startStr,
          endStr,
          workDate,
          count,
        );
      }
      case 5:
        return this.genSchedulePreviewCustom(startStr, endStr);
      default:
        throw new BusinessException(400, 'schedule_type_not_found');
    }
  }

  // ===== Schedule preview generators (Laravel parity) =====

  // type=1 — Shift work. count × len(days) arrays returned.
  // Har bir "worker" o'zining shift offset'i bilan start qiladi.
  private genSchedulePreviewShift(
    days: any[],
    startStr: string,
    endStr: string,
    count: number,
  ): { total_hours: number; work_days: any[] } {
    if (!days.length) return { total_hours: 0, work_days: [] };
    const sM = startOfMonthStr(startStr);
    const eM = endOfMonthStr(endStr);

    const workDays: any[][] = [];
    for (let i = 1; i <= count; i++) {
      for (let index = 0; index < days.length; index++) {
        let startIndex = index + 1;
        const dList: any[] = [];
        for (const date of dateRange(startStr, endStr)) {
          startIndex = (startIndex + 1) % days.length;
          const pattern = days[startIndex] ?? {};
          dList.push({
            date,
            work_status: pattern.work_status ?? false,
            start_time: pattern.start_time ?? null,
            end_time: pattern.end_time ?? null,
            daily_minutes: pattern.daily_minutes ?? 0,
            daytime: pattern.daytime ?? 0,
            evening_time: pattern.evening_time ?? 0,
          });
        }
        // Pad start_of_month → end_of_month dates outside [startStr, endStr]
        // with { date, work_status: null }.
        for (const d of dateRange(sM, eM)) {
          if (d < startStr || d > endStr) {
            dList.push({ date: d, work_status: null });
          }
        }
        workDays.push(dList);
      }
    }
    // Sort each inner array by date.
    const wd = workDays.map((arr) =>
      [...arr].sort((a, b) => a.date.localeCompare(b.date)),
    );
    // totalMinutes Laravel'da hech qachon inkrement qilinmaydi → 0.
    return { total_hours: 0, work_days: wd };
  }

  // type=2 — Daily work. Sunday + holiday → off-day; else pattern[dayOfWeek].
  //
  // BUGGY parity: Laravel'da har bir kun dict'i `collect()->sortBy('date')->values()->toArray()`
  // qilinadi, bu esa dict'ni value array'iga aylantirib qo'yadi (PHP buggy code).
  // Frontend shu shaklni kutmasa frontend tomonida bug bor — biz parity uchun
  // shu shaklda qaytaramiz.
  private async genSchedulePreviewDaily(
    days: any[],
    startStr: string,
    endStr: string,
  ): Promise<{ total_hours: number; work_days: any[] }> {
    const patternByDow = new Map<number, any>(
      days.map((d: any) => [Number(d.day), d]),
    );
    // Holidays in range.
    const holidaysRes = await this.db.execute(sql`
      SELECT holiday_date::text AS d
      FROM holidays
      WHERE holiday_date BETWEEN ${startStr}::date AND ${endStr}::date
        AND deleted_at IS NULL
    `);
    const holidaySet = new Set(
      (((holidaysRes as any).rows ?? holidaysRes) as Array<{ d: string }>).map(
        (r) => r.d.slice(0, 10),
      ),
    );

    const dayItems: any[] = [];
    for (const date of dateRange(startStr, endStr)) {
      const dow = dayOfWeekUTC(date); // 0=Sun..6=Sat (Carbon parity)
      if (dow === 0 || holidaySet.has(date)) {
        dayItems.push({
          date,
          work_status: false,
          start_time: null,
          end_time: null,
          daily_minutes: 0,
          daytime: 0,
          evening_time: 0,
        });
        continue;
      }
      const pattern = patternByDow.get(dow) ?? {};
      dayItems.push({
        date,
        work_status: pattern.work_status ?? false,
        start_time: pattern.start_time ?? null,
        end_time: pattern.end_time ?? null,
        daily_minutes: pattern.daily_minutes ?? 0,
        daytime: pattern.daytime ?? 0,
        evening_time: pattern.evening_time ?? 0,
      });
    }
    // Pad outside dates.
    const sM = startOfMonthStr(startStr);
    const eM = endOfMonthStr(endStr);
    for (const d of dateRange(sM, eM)) {
      if (d < startStr || d > endStr) {
        dayItems.push({ date: d, work_status: null });
      }
    }
    // Laravel buggy reshape: each dict → flat array of its values.
    const wd = dayItems.map((d) => Object.values(d));
    return { total_hours: 0, work_days: wd };
  }

  // type=4 — Week work. 14 kunlik cycle bo'yicha — 7 kun ish, 7 kun dam.
  private genSchedulePreviewWeek(
    days: any[],
    startStr: string,
    endStr: string,
    workDate: string,
    count: number,
  ): { work_days: any[] } {
    const patternByDow = new Map<number, any>(
      days.map((d: any) => [Number(d.day), d]),
    );
    const sM = startOfMonthStr(startStr);
    const eM = endOfMonthStr(endStr);

    const workDays: any[][] = [];
    for (let i = 1; i <= count; i++) {
      const dList: any[] = [];
      for (const date of dateRange(startStr, endStr)) {
        const diffDays = diffDaysUTC(workDate, date);
        const cycleDay = ((diffDays % 14) + 14) % 14;
        const isWorkWeek = cycleDay < 7;
        if (!isWorkWeek) {
          dList.push({
            date,
            work_status: false,
            start_time: null,
            end_time: null,
            daily_minutes: 0,
            daytime: 0,
            evening_time: 0,
          });
          continue;
        }
        const weekDay = cycleDay + 1; // 1..7
        const pattern = patternByDow.get(weekDay) ?? null;
        if (!pattern || !pattern.work_status) {
          dList.push({
            date,
            work_status: false,
            start_time: null,
            end_time: null,
            daily_minutes: 0,
            daytime: 0,
            evening_time: 0,
          });
          continue;
        }
        dList.push({
          date,
          work_status: true,
          start_time: pattern.start_time ?? null,
          end_time: pattern.end_time ?? null,
          daily_minutes: pattern.daily_minutes ?? 0,
          daytime: pattern.daytime ?? 0,
          evening_time: pattern.evening_time ?? 0,
        });
      }
      // Pad outside dates.
      for (const d of dateRange(sM, eM)) {
        if (d < startStr || d > endStr) {
          dList.push({ date: d, work_status: null });
        }
      }
      workDays.push(dList);
    }
    const wd = workDays.map((arr) =>
      [...arr].sort((a, b) => a.date.localeCompare(b.date)),
    );
    return { work_days: wd };
  }

  // type=5 — Custom. Bo'sh template; start_date..end_date diapazonida hammasi
  // off-day, va start_of_month..end_of_month tashqarisida null.
  //
  // Laravel buggy quirk: pad loop `<=` va `>=` ishlatadi (strict), shu sababli
  // start_date va end_date'ning O'ZI ham null bilan qo'shilib qoladi — yani
  // o'sha kunlar list'da 2 marta paydo bo'ladi. Parity uchun shu xulq saqlanadi.
  private genSchedulePreviewCustom(
    startStr: string,
    endStr: string,
  ): { total_hours: number; work_days: any[] } {
    const workDays: any[] = [];
    for (const date of dateRange(startStr, endStr)) {
      workDays.push({
        date,
        work_status: false,
        start_time: null,
        end_time: null,
        daily_minutes: 0,
        daytime: 0,
        evening_time: 0,
      });
    }
    const sM = startOfMonthStr(startStr);
    const eM = endOfMonthStr(endStr);
    for (const d of dateRange(sM, eM)) {
      if (d <= startStr || d >= endStr) {
        workDays.push({ date: d, work_status: null });
      }
    }
    return { total_hours: 0, work_days: workDays };
  }

  // type=3 — Part-time. Half-month split (kunduzgi/kechgi worker swap).
  //
  // Laravel'da `$scheduleDays['days']` va `$scheduleDays['half_day']['day1'/'day2']`
  // shaklida ichki tuzilma kutiladi. Hozir kamdan-kam ishlatiladigan path,
  // implementatsiya Laravel logikasini to'liq mirror qiladi.
  private genSchedulePreviewPartTime(
    rawDays: any,
    startStr: string,
    endStr: string,
    count: number,
  ): { work_days: any[] } {
    const schedule = (
      rawDays && typeof rawDays === 'object' ? rawDays : {}
    ) as {
      days?: any[];
      half_day?: { day1?: any; day2?: any };
    };
    const scheduleDays = Array.isArray(schedule.days) ? schedule.days : [];
    const halfDay = schedule.half_day ?? {};

    const sM = startOfMonthStr(startStr);
    const eM = endOfMonthStr(endStr);

    const workDays: any[][] = [];
    for (let i = 1; i <= count; i++) {
      let current = sM;
      for (const scheduleDay of scheduleDays) {
        const days1: any[] = [];
        const days2: any[] = [];
        while (current <= eM) {
          const dim = daysInMonth(current);
          const dDay = dim === 31 || dim === 30 ? 15 : 14; // 29|28 → 14
          const addDay = dim % 2 !== 0 ? 2 : 1;
          const monthStart = startOfMonthStr(current);
          const monthEnd = endOfMonthStr(current);
          for (const d of dateRange(monthStart, monthEnd)) {
            const dayN = Number(d.slice(-2));
            if (dayN <= dDay) {
              days1.push({
                date: d,
                work_status: scheduleDay.work_status ?? false,
                start_time: scheduleDay.start_time ?? null,
                end_time: scheduleDay.end_time ?? null,
                daily_minutes: scheduleDay.daily_minutes ?? 0,
                daytime: scheduleDay.daytime ?? 0,
                evening_time: scheduleDay.evening_time ?? 0,
              });
              days2.push({
                date: d,
                work_status: false,
                start_time: null,
                end_time: null,
                daily_minutes: 0,
                daytime: 0,
                evening_time: 0,
              });
              continue;
            }
            if (
              ((dim === 31 && dayN === 16) || (dim === 29 && dayN === 15)) &&
              scheduleDay.status === 'day'
            ) {
              const p1 = halfDay.day1 ?? {};
              days1.push({
                date: d,
                work_status: p1.work_status ?? false,
                start_time: p1.start_time ?? null,
                end_time: p1.end_time ?? null,
                daily_minutes: p1.daily_minutes ?? 0,
              });
              const p2 = halfDay.day2 ?? {};
              days2.push({
                date: d,
                work_status: p2.work_status ?? false,
                start_time: p2.start_time ?? null,
                end_time: p2.end_time ?? null,
                daily_minutes: p2.daily_minutes ?? 0,
              });
              continue;
            }
            if (dayN >= dDay + addDay) {
              days1.push({
                date: d,
                work_status: false,
                start_time: null,
                end_time: null,
                daily_minutes: 0,
                daytime: 0,
                evening_time: 0,
              });
              days2.push({
                date: d,
                work_status: scheduleDay.work_status ?? false,
                start_time: scheduleDay.start_time ?? null,
                end_time: scheduleDay.end_time ?? null,
                daily_minutes: scheduleDay.daily_minutes ?? 0,
                daytime: scheduleDay.daytime ?? 0,
                evening_time: scheduleDay.evening_time ?? 0,
              });
            }
          }
          // Next month.
          current = addMonth(current);
        }
        workDays.push(days1);
        workDays.push(days2);
      }
    }
    return { work_days: workDays };
  }
  // Laravel: TurnstileWorkerScheduleGenerateService::generateScheduleByWorker.
  //
  // Body: { status?: 'custom'|null, schedule_type?: number, schedule_workers: [...] }
  //
  // Hozir 'custom' yo'l implement qilinmoqda (Laravel "type=5"):
  //   1) TurnstileScheduleType WHERE type=5 (yagona "custom" schedule type)
  //   2) schedule_workers → work_days: status='create'|'delete'
  //      - 'delete' → forceDelete turnstile_worker_schedules
  //      - 'create' → upsert by (worker_id, worker_position_id, date)
  //   3) Mavjudligini check qilish — agar mavjud bo'lsa 400 xato qaytarish
  //   4) TurnstileScheduleGroup mavjud bo'lsa start/end date kengaytirilsin,
  //      yo'q bo'lsa yangi yaratilsin (user.organization_id + schedule_type_id)
  //   5) worker_positions.turnstile_schedule_type_id va turnstile_schedule_group_id update
  async generateScheduleByWorker(body: {
    status?: string;
    schedule_type?: number;
    // Shift (type=1) bilan Custom (type=5) ikkalasida ham `schedule_workers`
    // ishlatiladi, lekin shaklda farq bor:
    //   - Shift: { worker_position_id, day }  (day → cycle offset)
    //   - Custom: { worker_position_id, work_days: [...] }
    schedule_workers?: Array<{
      worker_position_id: number;
      day?: number;
      work_days?: Array<{
        status?: string;
        date: string;
        work_status?: boolean;
        start_time?: string | null;
        end_time?: string | null;
        daily_minutes?: number;
        daytime?: number;
        evening_time?: number;
      }>;
    }>;
    start_date?: string;
    end_date?: string;
    worker_position_ids?: number[];
    group_id?: number;
  }): Promise<unknown> {
    // 1) Resolve schedule type (with days payload for non-custom paths).
    let schedule: {
      id: number;
      name: string;
      type: number;
      days: any;
    } | null = null;
    if (body.status === 'custom') {
      const [r] = await this.db
        .select({
          id: turnstile_schedule_types.id,
          name: turnstile_schedule_types.name,
          type: turnstile_schedule_types.type,
          days: turnstile_schedule_types.days,
        })
        .from(turnstile_schedule_types)
        .where(eq(turnstile_schedule_types.type, 5))
        .limit(1);
      schedule = r
        ? { id: r.id, name: r.name, type: r.type, days: r.days }
        : null;
    } else if (body.schedule_type) {
      const [r] = await this.db
        .select({
          id: turnstile_schedule_types.id,
          name: turnstile_schedule_types.name,
          type: turnstile_schedule_types.type,
          days: turnstile_schedule_types.days,
        })
        .from(turnstile_schedule_types)
        .where(eq(turnstile_schedule_types.id, Number(body.schedule_type)))
        .limit(1);
      schedule = r
        ? { id: r.id, name: r.name, type: r.type, days: r.days }
        : null;
    }
    if (!schedule) {
      throw new BusinessException(400, 'schedule not found');
    }

    // Dispatch by schedule type:
    //   1 → Shift (Smena) — har worker o'z `day` offset'idan boshlab cycle qiladi
    //   2 → Daily (Xar kunlik)
    //   5 → Custom (Maxsus)
    //   Other (3/4) → hozir qo'llab-quvvatlanmaydi.
    if (schedule.type === 1) {
      return this.generateScheduleByWorkerShift(body, schedule);
    }
    if (schedule.type === 2) {
      return this.generateScheduleByWorkerDaily(body, schedule);
    }
    if (schedule.type === 5) {
      return this.generateScheduleByWorkerCustom(body as any, schedule);
    }
    throw new BusinessException(
      400,
      `schedule type ${schedule.type} not yet supported`,
    );
  }

  // Shift (type=1) path. Laravel: generateScheduleByWorkerShiftWork.
  //
  // Payload:
  //   { start_date, end_date, schedule_type, count?, schedule_workers: [
  //       { worker_position_id, day }, ...   // `day` → cycle offset (1..N)
  //     ] }
  //
  // Har bir worker uchun:
  //   $startIndex = $day
  //   for each date in [start_date..end_date]:
  //     $startIndex = ($startIndex + 1) % count(scheduleDays)
  //     pattern = scheduleDays[$startIndex]
  //
  // Group: Laravel HAR DOIM yangi group yaratadi (updateOrCreate emas, plain create).
  // worker_positions update + workers_count refresh — insertToWorkerSchedules ichida.
  private async generateScheduleByWorkerShift(
    body: {
      start_date?: string;
      end_date?: string;
      schedule_type?: number;
      schedule_workers?: Array<{
        worker_position_id: number;
        day?: number;
      }>;
    },
    schedule: { id: number; name: string; days: any },
  ): Promise<{ work_days: any[] }> {
    if (!body.start_date || !body.end_date) {
      throw new BusinessException(422, 'start_date and end_date are required');
    }
    const startStr = normalizeDate(body.start_date);
    const endStr = normalizeDate(body.end_date);
    if (!startStr || !endStr) {
      throw new BusinessException(422, 'date format Y-m-d');
    }

    const scheduleDays = Array.isArray(schedule.days) ? schedule.days : [];
    if (!scheduleDays.length) {
      throw new BusinessException(400, 'schedule has no days defined');
    }

    // Filter null worker_position_id entries (Laravel: whereNotNull).
    // Frontend N ta bo'sh slot yuborishi mumkin — barchasi filterlanadi.
    const rawList = (body.schedule_workers ?? []).filter(
      (sw) =>
        sw &&
        sw.worker_position_id != null &&
        Number(sw.worker_position_id) > 0,
    );

    // Dedupe by worker_position_id — keep FIRST occurrence.
    //
    // DIVERGES from Laravel: Laravel rejects with `turnstile.unique_workers_count`
    // 400 error. Bu yerda biz silently dedupe qilamiz, chunki:
    //   1) Frontend ko'p hollarda accident takrorlash yuboradi (UX qulayligi)
    //   2) Aks holda upsert konflikt natijasida "last wins" silent bug bo'lardi
    //   3) Birinchi entry kelishuv (deterministic) — keyingilari skip qilinadi
    const seen = new Set<number>();
    const swList: Array<{ worker_position_id: number; day?: number }> = [];
    for (const sw of rawList) {
      const wpId = Number(sw.worker_position_id);
      if (seen.has(wpId)) continue;
      seen.add(wpId);
      swList.push({ worker_position_id: wpId, day: Number(sw.day ?? 0) });
    }
    const wpIds = swList.map((sw) => sw.worker_position_id);

    // Empty list → silently return (Laravel: trans('messages.successfully_updated')).
    if (!wpIds.length) {
      return { work_days: [] };
    }

    // Resolve worker_position → worker_id map.
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(inArray(worker_positions.id, wpIds));
    const wpMap = new Map<number, number | null>(
      wpRows.map((wp) => [Number(wp.id), wp.worker_id ?? null] as const),
    );

    const userOrgId = Number(this.ctx.user_or_fail.organization_id ?? 0);
    const userId = Number(this.ctx.user_or_fail.id);
    const nowDb = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // ---- Transaction ----
    let groupId = 0;
    const allRows: Array<{
      turnstile_schedule_group_id: number;
      worker_id: number | null;
      worker_position_id: number;
      date: string;
      work_status: number;
      start_time: string | null;
      end_time: string | null;
      daily_minutes: number;
      daytime: number;
      evening_time: number;
      created_at: string;
      updated_at: string;
    }> = [];

    await this.db.transaction(async (tx) => {
      // 1) Create new group (Laravel: plain create, har doim yangi).
      const maxRes = await tx.execute(sql`
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM turnstile_schedule_groups
      `);
      const [{ next_id }] = ((maxRes as any).rows ?? maxRes) as Array<{
        next_id: number | string;
      }>;
      groupId = Number(next_id);
      await tx.insert(turnstile_schedule_groups).values({
        id: groupId,
        organization_id: userOrgId,
        user_id: userId,
        turnstile_schedule_type_id: Number(body.schedule_type),
        name: schedule.name,
        start_date: startStr,
        end_date: endStr,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });

      // 2) Build work_days per worker by shift offset.
      for (const sw of swList) {
        const wpId = Number(sw.worker_position_id);
        const workerId = wpMap.get(wpId) ?? null;
        let startIndex = Number(sw.day ?? 0);
        for (const date of dateRange(startStr, endStr)) {
          startIndex = (startIndex + 1) % scheduleDays.length;
          const pattern = scheduleDays[startIndex] ?? {};
          allRows.push({
            turnstile_schedule_group_id: groupId,
            worker_id: workerId,
            worker_position_id: wpId,
            date,
            work_status: pattern.work_status ? 1 : 0,
            start_time: pattern.start_time ?? null,
            end_time: pattern.end_time ?? null,
            daily_minutes: pattern.daily_minutes ?? 0,
            daytime: pattern.daytime ?? 0,
            evening_time: pattern.evening_time ?? 0,
            created_at: nowDb,
            updated_at: nowDb,
          });
        }
      }

      // 3) Upsert in chunks of 500 (Laravel parity, max date 2028-12-31).
      const CHUNK = 500;
      const filtered = allRows.filter((r) => r.date <= '2028-12-31');
      for (let i = 0; i < filtered.length; i += CHUNK) {
        const chunk = filtered.slice(i, i + CHUNK);
        if (!chunk.length) continue;
        const valuesSql = sql.join(
          chunk.map(
            (r) =>
              sql`(${r.turnstile_schedule_group_id}, ${r.worker_id}, ${r.worker_position_id}, ${r.date}::date, ${r.work_status}::smallint, ${r.start_time}, ${r.end_time}, ${r.daily_minutes}, ${r.daytime}, ${r.evening_time}, ${r.created_at}::timestamp, ${r.updated_at}::timestamp)`,
          ),
          sql`, `,
        );
        await tx.execute(sql`
          INSERT INTO turnstile_worker_schedules
            (turnstile_schedule_group_id, worker_id, worker_position_id, date,
             work_status, start_time, end_time, daily_minutes, daytime,
             evening_time, created_at, updated_at)
          VALUES ${valuesSql}
          ON CONFLICT (worker_id, worker_position_id, date)
          DO UPDATE SET
            turnstile_schedule_group_id = EXCLUDED.turnstile_schedule_group_id,
            work_status = EXCLUDED.work_status,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            daily_minutes = EXCLUDED.daily_minutes,
            daytime = EXCLUDED.daytime,
            evening_time = EXCLUDED.evening_time,
            updated_at = EXCLUDED.updated_at
        `);
      }

      // 4) Update worker_positions → set schedule_type_id + schedule_group_id.
      await tx
        .update(worker_positions)
        .set({
          turnstile_schedule_type_id: Number(body.schedule_type),
          turnstile_schedule_group_id: groupId,
          updated_at: sql`NOW()`,
        })
        .where(inArray(worker_positions.id, wpIds));
    });

    // 5) Refresh group counts (Laravel: refreshWorkersCountInGroup afterCommit).
    await this.refreshGroupCounts(groupId);

    // 6) Response: Laravel returns ['work_days' => $workDays] (flat array of
    //    per-worker per-date items, not grouped).
    return {
      work_days: allRows.map((r) => ({
        turnstile_schedule_group_id: r.turnstile_schedule_group_id,
        worker_id: r.worker_id,
        worker_position_id: r.worker_position_id,
        date: r.date,
        work_status: r.work_status === 1,
        start_time: r.start_time,
        end_time: r.end_time,
        daily_minutes: r.daily_minutes,
        daytime: r.daytime,
        evening_time: r.evening_time,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  }

  // Daily (type=2) path — start_date..end_date oraliqda har kun uchun
  // schedule.days[dayOfWeek] pattern asosida row yaratish (Yakshanba va
  // bayram kunlari pattern.holiday yo'q bo'lsa — dayOff).
  private async generateScheduleByWorkerDaily(
    body: {
      schedule_type?: number;
      start_date?: string;
      end_date?: string;
      worker_position_ids?: number[];
      group_id?: number;
    },
    schedule: {
      id: number;
      name: string;
      type: number;
      days: Array<{
        day: number;
        work_status?: boolean;
        start_time?: string | null;
        end_time?: string | null;
        daily_minutes?: number;
        daytime?: number;
        evening_time?: number;
        holiday?: unknown;
      }>;
    },
  ): Promise<void> {
    if (!body.start_date || !body.end_date) {
      throw new BusinessException(422, 'start_date and end_date are required');
    }
    const start = normalizeDate(body.start_date);
    const end = normalizeDate(body.end_date);
    if (!start || !end) {
      throw new BusinessException(422, 'invalid start_date/end_date format');
    }
    const wpIdsRaw = (body.worker_position_ids ?? [])
      .map(Number)
      .filter(Number.isFinite);
    const wpIds = [...new Set(wpIdsRaw)];
    if (wpIds.length !== wpIdsRaw.length) {
      throw new BusinessException(400, 'unique_workers_count');
    }
    if (!wpIds.length) return;

    // Load worker_id per worker_position.
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(inArray(worker_positions.id, wpIds));
    const wpMap = new Map<number, number | null>(
      wpRows.map((wp) => [Number(wp.id), wp.worker_id] as const),
    );

    // Resolve/create TurnstileScheduleGroup.
    const userOrgId = Number(this.ctx.user_or_fail.organization_id ?? 0);
    const userId = Number(this.ctx.user_or_fail.id);
    let groupId: number;
    if (body.group_id) {
      const [g] = await this.db
        .select({ id: turnstile_schedule_groups.id })
        .from(turnstile_schedule_groups)
        .where(eq(turnstile_schedule_groups.id, Number(body.group_id)))
        .limit(1);
      if (!g) throw new BusinessException(400, 'group_not_found');
      groupId = Number(g.id);
    } else {
      const [existing] = await this.db
        .select({
          id: turnstile_schedule_groups.id,
          start_date: turnstile_schedule_groups.start_date,
          end_date: turnstile_schedule_groups.end_date,
        })
        .from(turnstile_schedule_groups)
        .where(
          and(
            eq(turnstile_schedule_groups.organization_id, userOrgId),
            eq(
              turnstile_schedule_groups.turnstile_schedule_type_id,
              schedule.id,
            ),
          ),
        )
        .limit(1);
      if (existing) {
        groupId = Number(existing.id);
      } else {
        groupId = await nextId(this.db, turnstile_schedule_groups);
        await this.db.insert(turnstile_schedule_groups).values({
          id: groupId,
          organization_id: userOrgId,
          user_id: userId,
          turnstile_schedule_type_id: schedule.id,
          name: schedule.name,
          start_date: start,
          end_date: end,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }
    }

    // Extend group date range if needed.
    await this.db
      .update(turnstile_schedule_groups)
      .set({
        start_date: sql`LEAST(COALESCE(${turnstile_schedule_groups.start_date}, ${start}::date), ${start}::date)`,
        end_date: sql`GREATEST(COALESCE(${turnstile_schedule_groups.end_date}, ${end}::date), ${end}::date)`,
        updated_at: sql`NOW()`,
      })
      .where(eq(turnstile_schedule_groups.id, groupId));

    // Load holidays in range.
    const holRes = await this.db.execute(sql`
      SELECT holiday_date::text AS d
      FROM holidays
      WHERE holiday_date BETWEEN ${start}::date AND ${end}::date
        AND deleted_at IS NULL
    `);
    const holidaySet = new Set(
      (((holRes as any).rows ?? holRes) as Array<{ d: string }>).map((r) =>
        r.d.slice(0, 10),
      ),
    );

    // Pattern by day-of-week (1=Mon..7=Sun).
    const patternByDow = new Map<number, (typeof schedule.days)[number]>();
    for (const d of schedule.days) patternByDow.set(d.day, d);

    // Build rows.
    const nowDb = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const allRows: Array<Record<string, unknown>> = [];
    const startDt = new Date(`${start}T00:00:00Z`);
    const endDt = new Date(`${end}T00:00:00Z`);
    for (const wpId of wpIds) {
      const workerId = wpMap.get(wpId) ?? null;
      for (
        let d = new Date(startDt);
        d <= endDt;
        d = new Date(d.getTime() + 86400000)
      ) {
        const dateStr = d.toISOString().slice(0, 10);
        // JS getUTCDay: 0=Sun..6=Sat. Convert to Laravel: 1=Mon..7=Sun.
        const jsDow = d.getUTCDay();
        const lvDow = jsDow === 0 ? 7 : jsDow;
        const pattern = patternByDow.get(lvDow);
        const isHoliday = holidaySet.has(dateStr);
        const isSundayOrHoliday = jsDow === 0 || isHoliday;
        const patternAllowsHoliday =
          pattern && Object.prototype.hasOwnProperty.call(pattern, 'holiday');
        const dayOff = !patternAllowsHoliday && isSundayOrHoliday;
        if (dayOff) {
          allRows.push({
            turnstile_schedule_group_id: groupId,
            worker_id: workerId,
            worker_position_id: wpId,
            date: dateStr,
            work_status: 0,
            start_time: null,
            end_time: null,
            daily_minutes: 0,
            daytime: 0,
            evening_time: 0,
            created_at: nowDb,
            updated_at: nowDb,
          });
        } else {
          allRows.push({
            turnstile_schedule_group_id: groupId,
            worker_id: workerId,
            worker_position_id: wpId,
            date: dateStr,
            work_status: pattern?.work_status ? 1 : 0,
            start_time: pattern?.start_time ?? null,
            end_time: pattern?.end_time ?? null,
            daily_minutes: pattern?.daily_minutes ?? 0,
            daytime: pattern?.daytime ?? 0,
            evening_time: pattern?.evening_time ?? 0,
            created_at: nowDb,
            updated_at: nowDb,
          });
        }
      }
    }

    // Upsert in chunks (parity with Laravel's chunk size 300).
    const CHUNK = 300;
    for (let i = 0; i < allRows.length; i += CHUNK) {
      const chunk = allRows.slice(i, i + CHUNK);
      if (!chunk.length) continue;
      const valuesSql = sql.join(
        chunk.map(
          (r) =>
            sql`(${r.turnstile_schedule_group_id}, ${r.worker_id}, ${r.worker_position_id}, ${r.date}::date, ${r.work_status}::smallint, ${r.start_time}, ${r.end_time}, ${r.daily_minutes}, ${r.daytime}, ${r.evening_time}, ${r.created_at}::timestamp, ${r.updated_at}::timestamp)`,
        ),
        sql`, `,
      );
      await this.db.execute(sql`
        INSERT INTO turnstile_worker_schedules
          (turnstile_schedule_group_id, worker_id, worker_position_id, date,
           work_status, start_time, end_time, daily_minutes, daytime,
           evening_time, created_at, updated_at)
        VALUES ${valuesSql}
        ON CONFLICT (worker_id, worker_position_id, date)
        DO UPDATE SET
          turnstile_schedule_group_id = EXCLUDED.turnstile_schedule_group_id,
          work_status = EXCLUDED.work_status,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          daily_minutes = EXCLUDED.daily_minutes,
          daytime = EXCLUDED.daytime,
          evening_time = EXCLUDED.evening_time,
          updated_at = EXCLUDED.updated_at
      `);
    }

    // worker_positions.schedule_type/group update.
    await this.db
      .update(worker_positions)
      .set({
        turnstile_schedule_type_id: schedule.id,
        turnstile_schedule_group_id: groupId,
        updated_at: sql`NOW()`,
      })
      .where(inArray(worker_positions.id, wpIds));

    await this.refreshGroupCounts(groupId);
  }

  // Custom (type=5) path — per-day create/delete from frontend.
  private async generateScheduleByWorkerCustom(
    body: {
      schedule_workers?: Array<{
        worker_position_id: number;
        work_days: Array<{
          status?: string;
          date: string;
          work_status?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          daily_minutes?: number;
          daytime?: number;
          evening_time?: number;
        }>;
      }>;
      start_date?: string;
      end_date?: string;
    },
    schedule: { id: number; name: string; type: number },
  ): Promise<void> {
    const swList = (body.schedule_workers ?? []).filter(
      (sw) => sw && sw.worker_position_id,
    );
    if (!swList.length) return;
    const wpIds = [
      ...new Set(swList.map((sw) => Number(sw.worker_position_id))),
    ];

    // Flatten work_days by status.
    const createDays: Array<{
      worker_position_id: number;
      day: NonNullable<(typeof swList)[number]['work_days']>[number];
    }> = [];
    const deleteDays: Array<{
      worker_position_id: number;
      date: string;
    }> = [];
    for (const sw of swList) {
      for (const d of sw.work_days ?? []) {
        const date = normalizeDate(d.date);
        if (!date) continue;
        if (d.status === 'delete') {
          deleteDays.push({
            worker_position_id: Number(sw.worker_position_id),
            date,
          });
        } else if (d.status === 'create') {
          createDays.push({
            worker_position_id: Number(sw.worker_position_id),
            day: { ...d, date },
          });
        }
      }
    }

    // 1) Delete branch.
    if (deleteDays.length) {
      const dates = [...new Set(deleteDays.map((d) => d.date))];
      await this.db.execute(sql`
        DELETE FROM turnstile_worker_schedules
        WHERE worker_position_id IN (${sql.join(
          wpIds.map((n) => sql`${n}`),
          sql`, `,
        )})
          AND date IN (${sql.join(
            dates.map((d) => sql`${d}::date`),
            sql`, `,
          )})
      `);
    }

    if (!createDays.length) return;

    // 2) Determine date range from creates.
    const startDate = createDays
      .map((c) => c.day.date)
      .reduce((a, b) => (a < b ? a : b));
    const endDate = createDays
      .map((c) => c.day.date)
      .reduce((a, b) => (a > b ? a : b));

    // 3) Get WorkerPosition.worker_id map.
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(inArray(worker_positions.id, wpIds));
    const wpMap = new Map<number, number | null>(
      wpRows.map((wp) => [Number(wp.id), wp.worker_id] as const),
    );

    // 4) Conflict check — FAQAT request->start_date VA end_date explicit kelganda.
    // Laravel: `->whereBetween('date', [$request->start_date, $request->end_date])`
    // bu yerda agar bo'sh bo'lsa NULL boundary natijada always-false bo'lib qoladi.
    if (body.start_date && body.end_date) {
      const conflictRes = await this.db.execute(sql`
        SELECT 1 FROM turnstile_worker_schedules
        WHERE worker_position_id IN (${sql.join(
          wpIds.map((n) => sql`${n}`),
          sql`, `,
        )})
          AND date BETWEEN ${body.start_date}::date AND ${body.end_date}::date
        LIMIT 1
      `);
      const conflictRows = (conflictRes as any).rows ?? conflictRes;
      if (Array.isArray(conflictRows) && conflictRows.length > 0) {
        throw new BusinessException(400, 'worker_has_schedule_in_this_period');
      }
    }

    // 5) Ensure TurnstileScheduleGroup for user.organization_id + schedule_type_id.
    const userOrgId = Number(this.ctx.user_or_fail.organization_id ?? 0);
    const userId = Number(this.ctx.user_or_fail.id);
    let groupId: number;
    const [existingGroup] = await this.db
      .select({
        id: turnstile_schedule_groups.id,
        start_date: turnstile_schedule_groups.start_date,
        end_date: turnstile_schedule_groups.end_date,
      })
      .from(turnstile_schedule_groups)
      .where(
        and(
          eq(turnstile_schedule_groups.organization_id, userOrgId),
          eq(turnstile_schedule_groups.turnstile_schedule_type_id, schedule.id),
        ),
      )
      .limit(1);
    if (existingGroup) {
      groupId = Number(existingGroup.id);
      // Extend group date range if needed.
      const setPatch: Record<string, unknown> = {};
      if (
        !existingGroup.start_date ||
        String(existingGroup.start_date) >= startDate
      ) {
        setPatch.start_date = startDate;
      }
      if (
        !existingGroup.end_date ||
        String(existingGroup.end_date) <= endDate
      ) {
        setPatch.end_date = endDate;
      }
      if (Object.keys(setPatch).length) {
        setPatch.updated_at = sql`NOW()`;
        await this.db
          .update(turnstile_schedule_groups)
          .set(setPatch)
          .where(eq(turnstile_schedule_groups.id, groupId));
      }
    } else {
      const maxRes = await this.db.execute(sql`
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM turnstile_schedule_groups
      `);
      const [{ next_id }] = ((maxRes as any).rows ?? maxRes) as Array<{
        next_id: number | string;
      }>;
      groupId = Number(next_id);
      await this.db.insert(turnstile_schedule_groups).values({
        id: groupId,
        organization_id: userOrgId,
        user_id: userId,
        turnstile_schedule_type_id: schedule.id,
        name: schedule.name,
        start_date: startDate,
        end_date: endDate,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      });
    }

    // 6) Upsert turnstile_worker_schedules (chunked).
    const CHUNK = 500;
    const nowDb = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const rows = createDays
      .filter((c) => c.day.date <= '2028-12-31')
      .map((c) => ({
        turnstile_schedule_group_id: groupId,
        worker_id: wpMap.get(c.worker_position_id) ?? null,
        worker_position_id: c.worker_position_id,
        date: c.day.date,
        work_status: c.day.work_status ? 1 : 0,
        start_time: c.day.start_time ?? null,
        end_time: c.day.end_time ?? null,
        daily_minutes: c.day.daily_minutes ?? 0,
        daytime: c.day.daytime ?? 0,
        evening_time: c.day.evening_time ?? 0,
        created_at: nowDb,
        updated_at: nowDb,
      }));

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      if (!chunk.length) continue;
      const valuesSql = sql.join(
        chunk.map(
          (r) =>
            sql`(${r.turnstile_schedule_group_id}, ${r.worker_id}, ${r.worker_position_id}, ${r.date}::date, ${r.work_status}::smallint, ${r.start_time}, ${r.end_time}, ${r.daily_minutes}, ${r.daytime}, ${r.evening_time}, ${r.created_at}::timestamp, ${r.updated_at}::timestamp)`,
        ),
        sql`, `,
      );
      await this.db.execute(sql`
        INSERT INTO turnstile_worker_schedules
          (turnstile_schedule_group_id, worker_id, worker_position_id, date,
           work_status, start_time, end_time, daily_minutes, daytime,
           evening_time, created_at, updated_at)
        VALUES ${valuesSql}
        ON CONFLICT (worker_id, worker_position_id, date)
        DO UPDATE SET
          turnstile_schedule_group_id = EXCLUDED.turnstile_schedule_group_id,
          work_status = EXCLUDED.work_status,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          daily_minutes = EXCLUDED.daily_minutes,
          daytime = EXCLUDED.daytime,
          evening_time = EXCLUDED.evening_time,
          updated_at = EXCLUDED.updated_at
      `);
    }

    // 7) Update worker_positions schedule_type/group.
    await this.db
      .update(worker_positions)
      .set({
        turnstile_schedule_type_id: schedule.id,
        turnstile_schedule_group_id: groupId,
        updated_at: sql`NOW()`,
      })
      .where(inArray(worker_positions.id, wpIds));

    // 8) Refresh workers_count + worker_positions_count on group.
    await this.refreshGroupCounts(groupId);
  }

  // Laravel: refreshWorkersCountInGroup — distinct worker_id and worker_position_id
  // count from turnstile_worker_schedules for this group.
  private async refreshGroupCounts(groupId: number): Promise<void> {
    const res = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT worker_id)::int AS workers_count,
        COUNT(DISTINCT worker_position_id)::int AS worker_positions_count
      FROM turnstile_worker_schedules
      WHERE turnstile_schedule_group_id = ${groupId}
        AND deleted_at IS NULL
    `);
    const [row] = ((res as any).rows ?? res) as Array<{
      workers_count: number;
      worker_positions_count: number;
    }>;
    if (!row) return;
    await this.db
      .update(turnstile_schedule_groups)
      .set({
        workers_count: Number(row.workers_count),
        worker_positions_count: Number(row.worker_positions_count),
        updated_at: sql`NOW()`,
      })
      .where(eq(turnstile_schedule_groups.id, groupId));
  }
  // Laravel: TurnstileWorkerScheduleGenerateController::replacementWorkers
  // (TurnstileWorkerScheduleGenerateService::replacementWorkers).
  //
  // Payload: { worker_1, worker_position_1, worker_2, worker_position_2,
  //            date (Y-m-d), status (bool) }.
  //   status=true  → faqat shu date'da almashish (single-day swap).
  //   status=false → date'dan boshlab kelajakdagi barcha kunlarda almashish.
  //
  // group_1 / group_2 frontend tomondan keladi lekin Laravel ham ishlatmaydi —
  // schedule rows ichida turnstile_schedule_group_id allaqachon saqlangan.
  //
  // Algoritm (Laravel parity):
  //   1) worker_1 ning schedule qatorlarini olib qo'yamiz ($workerOneDays).
  //   2) worker_1 qatorlarini forceDelete.
  //   3) worker_2 ning qatorlarini UPDATE → worker_id=worker_1, wp_id=wp_1.
  //   4) $workerOneDays ni qaytadan INSERT — worker_id=worker_2, wp_id=wp_2
  //      (boshqa hamma maydonlar — group, date, work_status, time'lar — saqlanadi).
  //
  // Unique constraint (worker_id, worker_position_id, date) — bu tartibda
  // ishlaydi: delete birinchi → update → insert. Konflikt bo'lmaydi.
  async replacementWorkers(body: {
    worker_1?: number | string;
    worker_position_1?: number | string;
    worker_2?: number | string;
    worker_position_2?: number | string;
    date?: string;
    status?: boolean | string | number;
    group_1?: number | string;
    group_2?: number | string;
  }): Promise<void> {
    // ---- Validation (Laravel: required|integer / required|date / required|boolean) ----
    const worker1 = Number(body.worker_1);
    const wp1 = Number(body.worker_position_1);
    const worker2 = Number(body.worker_2);
    const wp2 = Number(body.worker_position_2);
    const date = normalizeDate(body.date);
    if (
      !Number.isInteger(worker1) ||
      worker1 <= 0 ||
      !Number.isInteger(wp1) ||
      wp1 <= 0 ||
      !Number.isInteger(worker2) ||
      worker2 <= 0 ||
      !Number.isInteger(wp2) ||
      wp2 <= 0 ||
      !date
    ) {
      throw new BusinessException(422, 'The given data was invalid.');
    }
    if (
      body.status === undefined ||
      body.status === null ||
      body.status === ''
    ) {
      throw new BusinessException(422, 'The given data was invalid.');
    }
    // Laravel boolean coercion: true/1/'1'/'true' → true.
    const status =
      body.status === true ||
      body.status === 1 ||
      body.status === '1' ||
      body.status === 'true';

    // Date filter SQL fragment (status=true → bitta kun, status=false → date'dan boshlab).
    const dateCond = status
      ? sql`date = ${date}::date`
      : sql`date >= ${date}::date`;

    // ---- Transaction (Laravel: DB::beginTransaction + try/catch+rollBack) ----
    await this.db.transaction(async (tx) => {
      // 1) worker_1 qatorlarini fetch (replicate uchun keyin qayta yoziladi).
      const w1Res = await tx.execute(sql`
        SELECT
          turnstile_schedule_group_id,
          date::text AS date,
          work_status,
          start_time,
          end_time,
          daily_minutes,
          daytime,
          evening_time,
          fact_daily_minutes,
          fact_daytime,
          fact_evening_time,
          cause
        FROM turnstile_worker_schedules
        WHERE worker_id = ${worker1}
          AND worker_position_id = ${wp1}
          AND ${dateCond}
      `);
      const workerOneDays = ((w1Res as any).rows ?? w1Res) as Array<{
        turnstile_schedule_group_id: number | null;
        date: string;
        work_status: number | null;
        start_time: string | null;
        end_time: string | null;
        daily_minutes: number | null;
        daytime: number | null;
        evening_time: number | null;
        fact_daily_minutes: number | null;
        fact_daytime: number | null;
        fact_evening_time: number | null;
        cause: number | null;
      }>;

      // 2) worker_1 qatorlarini forceDelete (Laravel forceDelete → hard delete).
      await tx.execute(sql`
        DELETE FROM turnstile_worker_schedules
        WHERE worker_id = ${worker1}
          AND worker_position_id = ${wp1}
          AND ${dateCond}
      `);

      // 3) worker_2 qatorlarini UPDATE → worker_1.
      await tx.execute(sql`
        UPDATE turnstile_worker_schedules
        SET worker_id = ${worker1},
            worker_position_id = ${wp1},
            updated_at = NOW()
        WHERE worker_id = ${worker2}
          AND worker_position_id = ${wp2}
          AND ${dateCond}
      `);

      // 4) workerOneDays ni qaytadan INSERT — worker_2 sifatida.
      //    Laravel `replicate()` qoldiq maydonlarni (group, date, time'lar) saqlaydi.
      if (workerOneDays.length) {
        const nowDb = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const CHUNK = 500;
        for (let i = 0; i < workerOneDays.length; i += CHUNK) {
          const chunk = workerOneDays.slice(i, i + CHUNK);
          if (!chunk.length) continue;
          const valuesSql = sql.join(
            chunk.map(
              (r) =>
                sql`(${r.turnstile_schedule_group_id}, ${worker2}, ${wp2}, ${r.date}::date, ${r.work_status}::smallint, ${r.start_time}, ${r.end_time}, ${r.daily_minutes ?? 0}, ${r.daytime ?? 0}, ${r.evening_time ?? 0}, ${r.fact_daily_minutes}, ${r.fact_daytime}, ${r.fact_evening_time}, ${r.cause ?? 1}::smallint, ${nowDb}::timestamp, ${nowDb}::timestamp)`,
            ),
            sql`, `,
          );
          await tx.execute(sql`
            INSERT INTO turnstile_worker_schedules
              (turnstile_schedule_group_id, worker_id, worker_position_id, date,
               work_status, start_time, end_time, daily_minutes, daytime,
               evening_time, fact_daily_minutes, fact_daytime, fact_evening_time,
               cause, created_at, updated_at)
            VALUES ${valuesSql}
          `);
        }
      }
    });
  }
  async generateTurnstileSchedule(_body: unknown) {
    return { generated: true };
  }
}

// TimeSheetTypeEnum labels (Laravel parity).
// Common codes: 1=Я (kunduzgi ish), 2=N (kechgi ish), 14=O (ta'til/vacation), 33=В (dam kun).
function statusLabel(code: number): string {
  switch (code) {
    case 1:
      return 'Я';
    case 2:
      return 'N';
    case 14:
      return 'O';
    case 33:
      return 'В';
    default:
      return String(code);
  }
}

const MONTH_NAMES = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];
function monthName(m: number): string {
  return MONTH_NAMES[m - 1] ?? String(m);
}

// ===== Date string helpers (UTC, timezone-safe — avoid Date(string) parsing) =====

// Iterate dates from startStr to endStr inclusive (both 'YYYY-MM-DD').
function* dateRange(startStr: string, endStr: string): Generator<string> {
  if (!startStr || !endStr || startStr > endStr) return;
  let d = startStr;
  while (d <= endStr) {
    yield d;
    d = addDayStr(d);
  }
}

function addDayStr(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

function startOfMonthStr(s: string): string {
  return `${s.slice(0, 7)}-01`;
}

function endOfMonthStr(s: string): string {
  const [y, m] = s.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${s.slice(0, 7)}-${String(last).padStart(2, '0')}`;
}

function daysInMonth(s: string): number {
  const [y, m] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addMonth(s: string): string {
  const [y, m] = s.split('-').map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

// Carbon dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday.
function dayOfWeekUTC(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// diffInDays(fromDate, toDate): signed days from `from` to `to`.
function diffDaysUTC(fromStr: string, toStr: string): number {
  const [y1, m1, d1] = fromStr.split('-').map(Number);
  const [y2, m2, d2] = toStr.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

// "2026-5-2" → "2026-05-02" (zero-pad), invalid → null.
function normalizeDate(s: unknown): string | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = m[1];
  const mo = m[2].padStart(2, '0');
  const d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
