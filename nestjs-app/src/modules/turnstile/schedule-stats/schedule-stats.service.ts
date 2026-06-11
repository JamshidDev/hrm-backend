// Turnstile schedule stats service. Laravel parity:
//   TurnstileScheduleStatsController → TurnstileService::statsForTurnstile, ...
//
// Barcha endpointlar role + org-scope hisobga oladi:
//   - WorkerPosition::filter($user, request()->all()) = childIds(role) ∩ orgs CSV ∩ org_id
//   - Departments CSV filter
//   - White-list workerlar (5 ta ID, statistikadan chiqariladi)
//   - dontInstallDeviceOrgIds — qurilma o'rnatilmagan orglar (absent stats'da)

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { MinioService } from '@/shared/minio/minio.service';
import { buildSuccess } from '@/common/utils/response.util';
import type { ApiSuccessResponse } from '@/common/types/api-response.type';
import { h_c_p_devices, worker_positions, workers } from '@/db/schema';
import { TURNSTILE_WHITELIST } from '@/modules/turnstile/_shared/helpers';

// Laravel VacationTypeEnum 1..8 → i18n key suffix.
// Laravel VacationTypeEnum::get — raw command type (41..55) → ta'til turi kaliti.
// 41,42,43,44,46→one; 45,49→three; 48→two; 51→five; 52→four; 53→seven; 55→six;
// default→eight.
function vacationTypeKey(type: number): string {
  switch (type) {
    case 41:
    case 42:
    case 43:
    case 44:
    case 46:
      return 'one';
    case 45:
    case 49:
      return 'three';
    case 48:
      return 'two';
    case 51:
      return 'five';
    case 52:
      return 'four';
    case 53:
      return 'seven';
    case 55:
      return 'six';
    default:
      return 'eight';
  }
}

interface WpMinimal {
  id: number;
  worker_id: number | null;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  photo: string | null;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_full_name: string | null;
  org_group: boolean | null;
  dept_name: string | null;
  dept_level: number | null;
  position_name: string | null;
}

export interface StatsQuery {
  date?: string;
  departments?: string;
  organizations?: string;
  organization_id?: number | string;
}

export interface PreviewQuery extends StatsQuery {
  page?: number | string;
  per_page?: number | string;
  type?: string;
  search?: string;
  auth_type?: string;
  direction?: string | number;
  start_time?: string;
  end_time?: string;
  // Laravel: request('download', 'view'). 'view' → preview, aks holda export.
  download?: string;
}

@Injectable()
export class ScheduleStatsService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
  ) {}

  // ────────────────────────────────────────────────────────────────────────
  // stats-one — Laravel: statsForTurnstile
  // ────────────────────────────────────────────────────────────────────────
  async statsForTurnstile(q: StatsQuery) {
    const date = parseDate(q.date);
    const today = date;
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;

    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) {
      return zeroStatsOne();
    }

    // base allowedWorkerIds query (WorkerPosition::filter + departments).
    const baseWpWhere = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, 2),
      inArray(worker_positions.organization_id, allowedIds),
      deptCsv.length > 0
        ? inArray(worker_positions.department_id, deptCsv)
        : undefined,
    );

    const [{ total: totalWorkers }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(baseWpWhere);

    const allowedWpIdsExists = sql`EXISTS (
      SELECT 1 FROM worker_positions wp_inner
       WHERE wp_inner.id = st.worker_position_id
         AND wp_inner.status = 2
         AND wp_inner.deleted_at IS NULL
         AND wp_inner.organization_id IN (${sqlIdList(allowedIds)})
         ${deptCsv.length > 0 ? sql` AND wp_inner.department_id IN (${sqlIdList(deptCsv)})` : sql``}
    )`;

    // scheduled_workers_today_count.
    const schedRes = await this.db.execute(sql`
      SELECT COUNT(DISTINCT st.worker_id) AS cnt
      FROM turnstile_worker_schedules st
      WHERE st.date = ${today}
        AND ${allowedWpIdsExists}
        AND st.worker_id NOT IN (${sqlIdList([...TURNSTILE_WHITELIST])})
        AND st.start_time IS NOT NULL
        AND st.work_status = 1
    `);
    const scheduled = num((rowsOf(schedRes)[0] as { cnt?: number })?.cnt);

    // attended_workers_today_count.
    const attendedRes = await this.db.execute(sql`
      SELECT COUNT(DISTINCT te.worker_id) AS cnt
      FROM terminal_events te
      WHERE te.event_date_and_time >= ${startOfDay}
        AND te.event_date_and_time < ${endOfDay}
        AND te.worker_id IN (
          SELECT wp.worker_id FROM worker_positions wp
           WHERE wp.status = 2 AND wp.deleted_at IS NULL
             AND wp.organization_id IN (${sqlIdList(allowedIds)})
             ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
        )
        AND te.worker_id NOT IN (${sqlIdList([...TURNSTILE_WHITELIST])})
    `);
    const attended = num((rowsOf(attendedRes)[0] as { cnt?: number })?.cnt);

    // absent_workers_today_count (Laravel subQuery, simplified — bizda partition
    // jadval, raw SQL bilan).
    const absentRes = await this.db.execute(sql`
      WITH sub AS (
        SELECT DISTINCT w.id AS worker_id,
          CASE
            WHEN st.worker_id IS NOT NULL
                 AND NOW() >= (st.date + st.start_time::interval)
                 AND te.worker_id IS NULL
            THEN 'scheduled_absent'
            WHEN st.worker_id IS NULL
                 AND te.worker_id IS NULL
                 AND EXTRACT(ISODOW FROM NOW()) NOT IN (6, 7)
            THEN 'no_schedule_absent'
            ELSE 'present'
          END AS status
        FROM workers w
        LEFT JOIN worker_positions wp ON w.id = wp.worker_id
        LEFT JOIN turnstile_worker_schedules st
               ON wp.id = st.worker_position_id
              AND st.date = ${today}::date
        LEFT JOIN terminal_events te
               ON w.id = te.worker_id
              AND te.event_date_and_time >= ${startOfDay}
              AND te.event_date_and_time < ${endOfDay}
        LEFT JOIN vacations v
               ON w.id = v.worker_id
              AND v.from <= ${today}::date
              AND v.to >= ${today}::date
              AND v.deleted_at IS NULL
        WHERE w.id NOT IN (${sqlIdList([...TURNSTILE_WHITELIST])})
          AND wp.id IN (
            SELECT wp2.id FROM worker_positions wp2
             WHERE wp2.status = 2 AND wp2.deleted_at IS NULL
               AND wp2.organization_id IN (${sqlIdList(allowedIds)})
               ${deptCsv.length > 0 ? sql` AND wp2.department_id IN (${sqlIdList(deptCsv)})` : sql``}
          )
          AND w.deleted_at IS NULL
          AND v.worker_id IS NULL
          AND wp.is_turnstile = TRUE
          AND wp.status = 2
      )
      SELECT COUNT(*) AS cnt FROM sub
      WHERE status IN ('no_schedule_absent', 'scheduled_absent')
    `);
    const absent = num((rowsOf(absentRes)[0] as { cnt?: number })?.cnt);

    return {
      totalWorkers: Number(totalWorkers),
      scheduled_workers_today: scheduled,
      attended_workers_today: attended,
      absent_workers_today: absent,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // stats-two — Laravel: scheduleStatsByMonth (count + top 5 worker preview)
  // ────────────────────────────────────────────────────────────────────────
  async scheduleStatsByMonth(q: StatsQuery) {
    const date = parseDate(q.date);
    const monthStart = monthStartOf(date);
    const monthEnd = monthEndOf(date);
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) return { count: 0, workerList: [] };

    // Laravel: TurnstileWorkerSchedule->whereBetween('date',...)->select('worker_position_id')
    //   + Vacation->pluck('worker_id')
    //   + WorkerPosition::filter->is_turnstile=true ->whereNotIn(id, sched)->whereNotIn(worker_id, vac)
    // PG plan'i Laravel'ga yaqin bo'lishi uchun NOT IN (subquery) ishlatamiz.
    const whereSql = sql`
      wp.status = 2 AND wp.deleted_at IS NULL
        AND wp.is_turnstile = TRUE
        AND wp.organization_id IN (${sqlIdList(allowedIds)})
        ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
        AND wp.id NOT IN (
          SELECT ts.worker_position_id FROM turnstile_worker_schedules ts
           WHERE ts.date BETWEEN ${monthStart}::date AND ${monthEnd}::date
        )
        AND wp.worker_id NOT IN (
          SELECT v.worker_id FROM vacations v
           WHERE v.from <= ${monthEnd}::date
             AND v.to >= ${monthStart}::date
        )
    `;

    const cntRes = await this.db.execute(sql`
      SELECT COUNT(*) AS cnt FROM worker_positions wp WHERE ${whereSql}
    `);
    const cnt = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);

    const top5Res = await this.db.execute(sql`
      SELECT
        w.id AS worker_id,
        w.last_name, w.first_name, w.middle_name, w.photo
      FROM worker_positions wp
      INNER JOIN workers w ON w.id = wp.worker_id
      WHERE ${whereSql}
      LIMIT 5
    `);
    const top = rowsOf(top5Res) as Array<{
      worker_id: number | string;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      photo: string | null;
    }>;
    const workerList = await Promise.all(
      top.map(async (r) => ({
        worker_id: Number(r.worker_id),
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        photo: await this.minio.fileUrl(r.photo),
      })),
    );

    return { count: cnt, workerList };
  }

  // ────────────────────────────────────────────────────────────────────────
  // stats-three — Laravel: statsCurrentEvents
  // ────────────────────────────────────────────────────────────────────────
  async statsCurrentEvents(q: StatsQuery) {
    const date = parseDate(q.date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) {
      return { worker_stats: emptyCurrentEvents() };
    }

    const allowedWorkerIdsSubq = sql`(
      SELECT wp.worker_id FROM worker_positions wp
       WHERE wp.status = 2 AND wp.deleted_at IS NULL
         AND wp.organization_id IN (${sqlIdList(allowedIds)})
         ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
    )`;

    const statsRes = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT CASE WHEN te.direction = TRUE  AND te.rn = 1 THEN te.worker_id END) AS current_in,
        COUNT(DISTINCT CASE WHEN te.direction = FALSE AND te.rn = 1 THEN te.worker_id END) AS current_out
      FROM (
        SELECT
          te.worker_id, te.direction,
          ROW_NUMBER() OVER (
            PARTITION BY te.worker_id
            ORDER BY te.event_date_and_time DESC
          ) AS rn
        FROM terminal_events te
        WHERE te.worker_id IN ${allowedWorkerIdsSubq}
          AND te.event_date_and_time >= ${startOfDay}
          AND te.event_date_and_time <  ${endOfDay}
      ) te
    `);

    const inRes = await this.db.execute(sql`
      SELECT
        te.worker_id, w.last_name, w.first_name, w.middle_name, w.photo,
        te.event_date_and_time AS last_entry_time
      FROM (
        SELECT te.worker_id, te.event_date_and_time,
          ROW_NUMBER() OVER (PARTITION BY te.worker_id ORDER BY te.event_date_and_time DESC) AS rn
        FROM terminal_events te
        WHERE te.worker_id IN ${allowedWorkerIdsSubq}
          AND te.direction = TRUE
          AND te.event_date_and_time >= ${startOfDay}
          AND te.event_date_and_time <  ${endOfDay}
      ) te
      INNER JOIN workers w ON te.worker_id = w.id
      WHERE te.rn = 1 AND w.deleted_at IS NULL
      ORDER BY te.event_date_and_time DESC
      LIMIT 3
    `);

    const outRes = await this.db.execute(sql`
      SELECT
        te.worker_id, w.last_name, w.first_name, w.middle_name, w.photo,
        te.event_date_and_time AS last_exit_time
      FROM (
        SELECT te.worker_id, te.event_date_and_time,
          ROW_NUMBER() OVER (PARTITION BY te.worker_id ORDER BY te.event_date_and_time DESC) AS rn
        FROM terminal_events te
        WHERE te.worker_id IN ${allowedWorkerIdsSubq}
          AND te.direction = FALSE
          AND te.event_date_and_time >= ${startOfDay}
          AND te.event_date_and_time <  ${endOfDay}
      ) te
      INNER JOIN workers w ON te.worker_id = w.id
      WHERE te.rn = 1 AND w.deleted_at IS NULL
      ORDER BY te.event_date_and_time DESC
      LIMIT 3
    `);

    const statRow = rowsOf(statsRes)[0] as
      | { current_in?: number | string; current_out?: number | string }
      | undefined;
    return {
      worker_stats: {
        current_in: num(statRow?.current_in),
        current_out: num(statRow?.current_out),
        top_in_workers: await Promise.all(
          rowsOf(inRes).map(async (r: any) => ({
            worker_id: Number(r.worker_id),
            last_name: r.last_name,
            first_name: r.first_name,
            middle_name: r.middle_name,
            photo: await this.minio.fileUrl(r.photo ?? null),
            last_entry_time: r.last_entry_time,
          })),
        ),
        top_out_workers: await Promise.all(
          rowsOf(outRes).map(async (r: any) => ({
            worker_id: Number(r.worker_id),
            last_name: r.last_name,
            first_name: r.first_name,
            middle_name: r.middle_name,
            photo: await this.minio.fileUrl(r.photo ?? null),
            last_exit_time: r.last_exit_time,
          })),
        ),
      },
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // stats-four — Laravel: dailyAttendanceChart
  // ────────────────────────────────────────────────────────────────────────
  async dailyAttendanceChart(q: StatsQuery) {
    const date = parseDate(q.date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);

    const baseChart = Array.from({ length: 12 }, (_, i) => ({
      hour: `${String(i * 2).padStart(2, '0')}:00`,
      count: 0,
    }));

    if (allowedIds.length === 0) {
      return {
        daily_attendance_chart: baseChart,
        devices: { all: 0, online: 0, offline: 0 },
        auth_type: { mobile_face: 0, other: 0 },
      };
    }

    const allowedWorkerIdsSubq = sql`(
      SELECT wp.worker_id FROM worker_positions wp
       WHERE wp.status = 2 AND wp.deleted_at IS NULL
         AND wp.organization_id IN (${sqlIdList(allowedIds)})
         ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
    )`;

    // Chart 2-hour blocks.
    const chartRes = await this.db.execute(sql`
      SELECT FLOOR(EXTRACT(HOUR FROM event_date_and_time) / 2) AS hour_block,
             COUNT(*) AS total
      FROM terminal_events
      WHERE worker_id IN ${allowedWorkerIdsSubq}
        AND event_date_and_time >= ${startOfDay}
        AND event_date_and_time <  ${endOfDay}
      GROUP BY hour_block
    `);
    const chartMap = new Map<number, number>();
    for (const r of rowsOf(chartRes) as Array<{
      hour_block: number | string;
      total: number | string;
    }>) {
      chartMap.set(Number(r.hour_block), Number(r.total));
    }
    const daily = baseChart.map((b, i) => ({
      hour: b.hour,
      count: chartMap.get(i) ?? 0,
    }));

    // Devices.
    const devices = await this.devicesCounts(allowedIds);

    // auth_type breakdown.
    const authRes = await this.db.execute(sql`
      SELECT
        COUNT(DISTINCT CASE WHEN auth_type = 'MobileFaceEvent' THEN worker_id END) AS mobile_face_count,
        COUNT(DISTINCT worker_id) AS total_count
      FROM terminal_events
      WHERE worker_id IN ${allowedWorkerIdsSubq}
        AND event_date_and_time >= ${startOfDay}
        AND event_date_and_time <  ${endOfDay}
    `);
    const authRow = rowsOf(authRes)[0] as
      | { mobile_face_count?: number | string; total_count?: number | string }
      | undefined;
    const mobile = num(authRow?.mobile_face_count);
    const total = num(authRow?.total_count);
    return {
      daily_attendance_chart: daily,
      devices,
      auth_type: { mobile_face: mobile, other: total - mobile },
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // stats-five — Laravel: devives (devices only)
  // ────────────────────────────────────────────────────────────────────────
  async statsDevices(q: StatsQuery = {}) {
    const allowedIds = await this.effectiveOrgIds(q);
    return this.devicesCounts(allowedIds);
  }

  // ────────────────────────────────────────────────────────────────────────
  // stats-six — Laravel: privilegeTurnstile
  // ────────────────────────────────────────────────────────────────────────
  async privilegeTurnstile(q: StatsQuery) {
    const date = parseDate(q.date);
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) {
      return zeroStatsSix();
    }

    const baseWp = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, 2),
      inArray(worker_positions.organization_id, allowedIds),
      deptCsv.length > 0
        ? inArray(worker_positions.department_id, deptCsv)
        : undefined,
    );

    const [{ total: notPassed }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(and(baseWp, eq(worker_positions.is_turnstile, false)));

    const [{ total: privilege }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(
        and(
          baseWp,
          sql`(${worker_positions.turnstile_privilege_start_minute} != 0
                OR ${worker_positions.turnstile_privilege_end_minute} != 0)`,
        ),
      );

    // Vacation workers — joriy worker_id ichida, to >= date.
    const vacRes = await this.db.execute(sql`
      SELECT COUNT(*) AS cnt FROM vacations v
      WHERE v.deleted_at IS NULL
        AND v.to >= ${date}::date
        AND v.worker_id IN (
          SELECT wp.worker_id FROM worker_positions wp
           WHERE wp.status = 2 AND wp.deleted_at IS NULL
             AND wp.organization_id IN (${sqlIdList(allowedIds)})
             ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
        )
    `);
    const vacationCount = num((rowsOf(vacRes)[0] as { cnt?: number })?.cnt);

    // Casual workers — turnstile_worker_schedules.work_status=0 today.
    const casualRes = await this.db.execute(sql`
      SELECT COUNT(*) AS cnt FROM turnstile_worker_schedules ts
      WHERE ts.date = ${date}::date
        AND ts.work_status = 0
        AND ts.worker_id IN (
          SELECT wp.worker_id FROM worker_positions wp
           WHERE wp.status = 2 AND wp.deleted_at IS NULL
             AND wp.organization_id IN (${sqlIdList(allowedIds)})
             ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
        )
    `);
    const casualCount = num((rowsOf(casualRes)[0] as { cnt?: number })?.cnt);

    return {
      not_passed_turnstile_workers_count: Number(notPassed),
      privilege_turnstile_workers_count: Number(privilege),
      vacation_workers: { total: vacationCount },
      casual_workers: casualCount,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // stats-seven — Laravel: lateAndEarlyStatsGroupedByDays
  // ────────────────────────────────────────────────────────────────────────
  // Laravel: getLateWorkersGroupedByDays + getEarlyWorkersGroupedByDays.
  // Har sana uchun LEFT JOIN LATERAL bilan kunning BIRINCHI (late) / OXIRGI
  // (early) terminal_event'i olinadi.
  //
  // PERFORMANCE: LATERAL'da `event_date_and_time >= d1 AND < d2` (RANGE) ishlatiladi
  // → terminal_events (partitsiyalangan, 20M+) partition-pruning + index. `::time`
  // cast faqat lateral natijasiga (1 qator/jadval) qo'llanadi — arzon. (Eski
  // placeholder `event_date_and_time::date = st.date` cast'i pruning'ni buzib
  // butun jadvalni skanerlardi → prodda 18s.)
  async lateAndEarlyStatsGroupedByDays(q: StatsQuery) {
    const date = parseDate(q.date);
    const dates: string[] = [];
    for (let i = 0; i < 3; i++) dates.push(addDays(date, -i));

    // existSql org filter — Laravel prioriteti: organization_id > organizations >
    // childIds (INTERSECT emas — biri ikkinchisini almashtiradi).
    const childIds = await this.scope.ids();
    const single =
      q.organization_id != null ? Number(q.organization_id) : undefined;
    const csv = parseCsvInts(q.organizations);
    let orgFilter = sql``;
    if (Number.isInteger(single) && single! > 0) {
      orgFilter = sql` AND wp.organization_id = ${single}`;
    } else if (csv.length > 0) {
      orgFilter = sql` AND wp.organization_id IN (${sqlIdList(csv)})`;
    } else if (childIds.length > 0) {
      orgFilter = sql` AND wp.organization_id IN (${sqlIdList(childIds)})`;
    }
    const deptCsv = parseCsvInts(q.departments);
    const deptFilter =
      deptCsv.length > 0
        ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})`
        : sql``;

    // Laravel whiteList() — stats'dan chiqariladigan workerlar.
    const WHITELIST = [62309, 16655, 25394, 19278, 587];
    const existSql = sql`EXISTS (
      SELECT 1 FROM worker_positions wp
      WHERE wp.id = t.worker_position_id
        AND wp.status = 2
        AND wp.is_turnstile = true
        AND wp.deleted_at IS NULL
        AND wp.worker_id NOT IN (${sqlIdList(WHITELIST)})${deptFilter}${orgFilter}
    )`;

    const nextDay = (d: string) => addDays(d, 1);

    // Laravel SQL'ga date'larni LITERAL qo'yadi — partitsiyalangan terminal_events
    // plan-time partition pruning qilishi uchun (parametr generic-plan'da pruning'ni
    // yo'qotishi mumkin). YYYY-MM-DD validatsiyasi — injection xavfsiz.
    const lit = (d: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        throw new Error(`invalid date literal: ${d}`);
      }
      return sql.raw(`'${d}'`);
    };

    // late: kunning BIRINCHI event'i (ASC LIMIT 1), direction=TRUE (kirish),
    // event vaqti > start_time. start_time <> '00:00'.
    const latePart = (d1: string) => sql`
      SELECT ${lit(d1)}::text AS date, COUNT(DISTINCT t.worker_id) AS cnt
      FROM turnstile_worker_schedules t
      LEFT JOIN LATERAL (
        SELECT te.event_date_and_time, te.direction
        FROM terminal_events te
        WHERE te.worker_id = t.worker_id
          AND te.event_date_and_time >= ${lit(d1)}
          AND te.event_date_and_time <  ${lit(nextDay(d1))}
          AND te.deleted_at IS NULL
        ORDER BY te.event_date_and_time
        LIMIT 1
      ) AS first_te ON TRUE AND first_te.direction = TRUE
      WHERE t.date = ${lit(d1)}
        AND t.work_status = 1
        AND t.start_time <> '00:00'
        AND t.deleted_at IS NULL
        AND ${existSql}
        AND first_te.event_date_and_time::time > t.start_time
    `;

    // early: kunning OXIRGI event'i (DESC LIMIT 1), direction=FALSE (chiqish),
    // event vaqti < end_time. end_time IS NOT NULL.
    const earlyPart = (d1: string) => sql`
      SELECT ${lit(d1)}::text AS date, COUNT(DISTINCT t.worker_id) AS cnt
      FROM turnstile_worker_schedules t
      LEFT JOIN LATERAL (
        SELECT te.event_date_and_time, te.direction
        FROM terminal_events te
        WHERE te.worker_id = t.worker_id
          AND te.event_date_and_time >= ${lit(d1)}
          AND te.event_date_and_time <  ${lit(nextDay(d1))}
          AND te.deleted_at IS NULL
        ORDER BY te.event_date_and_time DESC
        LIMIT 1
      ) AS last_te ON TRUE AND last_te.direction = FALSE
      WHERE t.date = ${lit(d1)}
        AND t.work_status = 1
        AND t.deleted_at IS NULL
        AND t.end_time IS NOT NULL
        AND ${existSql}
        AND last_te.event_date_and_time::time < t.end_time
    `;

    const [lateRes, earlyRes] = await Promise.all([
      this.db.execute(
        sql`${sql.join(
          dates.map((d) => latePart(d)),
          sql` UNION ALL `,
        )} ORDER BY date DESC`,
      ),
      this.db.execute(
        sql`${sql.join(
          dates.map((d) => earlyPart(d)),
          sql` UNION ALL `,
        )} ORDER BY date DESC`,
      ),
    ]);

    return {
      late_and_early: {
        late: rowsOf(lateRes).map((r: any) => ({
          date: r.date,
          count: Number(r.cnt),
        })),
        early: rowsOf(earlyRes).map((r: any) => ({
          date: r.date,
          count: Number(r.cnt),
        })),
      },
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Dashboard preview — Laravel: DashboardPreviewController::preview
  // Dispatches by `type` query param.
  // ────────────────────────────────────────────────────────────────────────
  async preview(q: PreviewQuery = {}): Promise<unknown> {
    const type = q.type ?? '';
    // Laravel: $status = request('download', 'view'). download != 'view' bo'lsa
    // export trigger (ExportTaskRunner fonда) + "successfully_exported" javobi.
    const download = q.download && q.download !== 'view';
    switch (type) {
      case 'current_in':
        return this.lastEventWorkersPreview(q, true);
      case 'current_out':
        return this.lastEventWorkersPreview(q, false);
      case 'come':
        if (download) return this.comeWorkersExport(q);
        return this.comeWorkersPreview(q);
      case 'not_come':
        return this.absentWorkersTodayPreview(q);
      case 'late_come':
        return this.lateComePreview(q);
      case 'early_leave':
        return this.earlyLeavePreview(q);
      case 'online_devices':
        return this.devicesPreview(q, true);
      case 'offline_devices':
        return this.devicesPreview(q, false);
      case 'daily_attendance':
        return this.dailyAttendancePreview(q);
      case 'vacations':
        return this.vacationsPreview(q);
      case 'not_passed_turnstile_workers':
        return this.notPassedTurnstilePreview(q);
      case 'privilege_turnstile_workers':
        return this.privilegeTurnstilePreview(q);
      case 'casual_workers':
        return this.casualWorkersPreview(q);
      case 'notIncludedSchedule':
        return this.notIncludedSchedulePreview(q);
      default:
        // Laravel default → Helper::response() → {message:true, error:false, data:[]}
        return [] as Array<unknown>;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: current_in / current_out / come — CurrentInResource shape.
  // ────────────────────────────────────────────────────────────────────────
  // Laravel: filterQuery + lastEvent (LATERAL te).
  // Output: paginated {id, last_name, first_name, middle_name, photo,
  //   last_event, direction, organization_name, department_name, position_name}.
  async lastEventWorkersPreview(q: PreviewQuery, direction: boolean) {
    return this.currentLastEventPreview(q, { direction });
  }

  async comeWorkersPreview(q: PreviewQuery) {
    // Laravel: comeWorkers 'view' — dontInstallDeviceOrgIds filtri olib tashlandi.
    return this.currentLastEventPreview(q, {
      direction: null, // any direction (whereNotNull)
      authType: q.auth_type,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // EXPORT: come — Laravel: DashboardPreviewController::comeWorkers (download
  //   branch) → UserExportTask(type=TURNSTILE_COME=24) +
  //   TurnstileComeWorkersExportToExcelJob. ExportTaskRunner fonда Excel yasaydi,
  //   javob darhol "successfully_exported" (Laravel parity).
  // ────────────────────────────────────────────────────────────────────────
  async comeWorkersExport(q: PreviewQuery): Promise<ApiSuccessResponse<[]>> {
    // Scope/lang request kontekstida oldindan hisoblanadi (build fonда ishlaydi).
    const scopeIds = await this.effectiveOrgIds(q);
    const lang = this.ctx.lang;
    await this.exportRunner.run({
      type: 24, // ExportTaskEnum.TURNSTILE_COME
      folder: 'turnstile',
      build: () => this.buildComeWorkersExcel(q, scopeIds, lang),
    });
    return buildSuccess(
      this.translate('messages.successfully_exported', lang),
      [],
    );
  }

  // Laravel: TurnstileComeWorkersExportToExcelJob::handle.
  //   filterQuery($user) → auth_type bo'lsa allEvents (LATERAL, distinct'siz) aks
  //   holda lastEvent (LATERAL LIMIT 1, distinct) → whereNotNull('te.direction')
  //   → auth_type filter → select 8 ustun → map → DynamicExportFromArray('turnstile').
  private async buildComeWorkersExcel(
    q: PreviewQuery,
    scopeIds: number[],
    lang: string,
  ): Promise<Buffer> {
    // Header'lar — DynamicExportFromArray('turnstile'): messages.turnstile.{key}.
    const headerKeys = [
      'last_name',
      'first_name',
      'middle_name',
      'last_event',
      'direction',
      'organization_name',
      'department_name',
      'position_name',
    ] as const;
    const columns = headerKeys.map((key) => ({
      header: this.translate(`messages.turnstile.${key}`, lang) || key,
      key,
      width: 24,
    }));

    // Scope bo'sh → bo'sh fayl (Laravel filter() bo'sh natija).
    if (scopeIds.length === 0) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [{ name: 'turnstile', columns, rows: [] }],
      });
    }

    const date = parseDate(q.date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;
    const deptCsv = parseCsvInts(q.departments);
    const allEvents = !!q.auth_type;

    const deptCond =
      deptCsv.length > 0
        ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})`
        : sql``;
    const searchCond = q.search
      ? sql` AND CONCAT(workers.last_name, ' ', workers.first_name, ' ', workers.middle_name) ILIKE ${`%${q.search}%`}`
      : sql``;
    const authCond = (() => {
      if (!q.auth_type) return sql``;
      if (q.auth_type === 'MobileFaceEvent')
        return sql` AND te.auth_type = 'MobileFaceEvent'`;
      if (q.auth_type === 'ACSEventFaceVerifyPass')
        return sql` AND te.auth_type != 'MobileFaceEvent'`;
      return sql``;
    })();

    // allEvents → LATERAL'da LIMIT yo'q (kunning barcha hodisalari, distinct'siz);
    // lastEvent → LATERAL LIMIT 1 (oxirgi hodisa).
    const lateral = allEvents
      ? sql`LEFT JOIN LATERAL (
            SELECT te1.direction, te1.auth_type, te1.event_date_and_time AS last_event
            FROM terminal_events te1
            WHERE te1.worker_id = workers.id
              AND te1.event_date_and_time >= ${startOfDay}
              AND te1.event_date_and_time <  ${endOfDay}
            ORDER BY te1.event_date_and_time DESC
          ) AS te ON TRUE`
      : sql`LEFT JOIN LATERAL (
            SELECT te1.direction, te1.auth_type, te1.event_date_and_time AS last_event
            FROM terminal_events te1
            WHERE te1.worker_id = workers.id
              AND te1.event_date_and_time >= ${startOfDay}
              AND te1.event_date_and_time <  ${endOfDay}
            ORDER BY te1.event_date_and_time DESC
            LIMIT 1
          ) AS te ON TRUE`;

    const fromJoinWhere = sql`
      FROM workers
      INNER JOIN worker_positions wp
              ON wp.worker_id = workers.id
             AND wp.status = 2
             AND wp.deleted_at IS NULL
             AND wp.organization_id IN (${sqlIdList(scopeIds)})${deptCond}
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d   ON d.id = wp.department_id
      LEFT JOIN positions p     ON p.id = wp.position_id
      ${lateral}
      WHERE workers.deleted_at IS NULL${searchCond}
        AND te.direction IS NOT NULL${authCond}
    `;

    // Laravel: lastEvent → ->distinct() (barcha select ustunlari bo'yicha);
    // allEvents → distinct YO'Q.
    const distinct = allEvents ? sql`` : sql`DISTINCT`;
    const selectCols = sql`
      workers.last_name, workers.first_name, workers.middle_name,
      te.last_event, te.direction,
      o.name AS organization_name,
      d.name AS department_name,
      p.name AS position_name
    `;

    const res = await this.db.execute(sql`
      SELECT ${distinct} ${selectCols}
      ${fromJoinWhere}
    `);

    const rows = rowsOf(res).map((r: any) => ({
      last_name: r.last_name,
      first_name: r.first_name,
      middle_name: r.middle_name,
      last_event: r.last_event,
      // Laravel: hardcoded 'Kirish'/'Chiqish' (til'dan qat'i nazar).
      direction: r.direction ? 'Kirish' : 'Chiqish',
      organization_name: r.organization_name,
      department_name: r.department_name,
      position_name: r.position_name,
    }));

    return this.excel.build({
      creator: 'HRM',
      sheets: [{ name: 'turnstile', columns, rows }],
    });
  }

  private async currentLastEventPreview(
    q: PreviewQuery,
    opts: {
      direction: boolean | null;
      authType?: string;
    },
  ) {
    const { page, perPage, offset } = pageOf(q);
    const date = parseDate(q.date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) return emptyPaginate(page);

    const orgListSql = sqlIdList(allowedIds);
    const deptCond =
      deptCsv.length > 0
        ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})`
        : sql``;

    // Direction filter.
    const dirCond =
      opts.direction === null
        ? sql` AND te.direction IS NOT NULL`
        : sql` AND te.direction = ${opts.direction}`;

    // auth_type filter (only for come).
    const authCond = (() => {
      if (!opts.authType) return sql``;
      if (opts.authType === 'MobileFaceEvent')
        return sql` AND te.auth_type = 'MobileFaceEvent'`;
      if (opts.authType === 'ACSEventFaceVerifyPass')
        return sql` AND te.auth_type != 'MobileFaceEvent'`;
      return sql``;
    })();

    // Search.
    const searchCond = q.search
      ? sql` AND CONCAT(workers.last_name, ' ', workers.first_name, ' ', workers.middle_name) ILIKE ${`%${q.search}%`}`
      : sql``;

    const fromJoinWhere = sql`
      FROM workers
      INNER JOIN worker_positions wp
              ON wp.worker_id = workers.id
             AND wp.status = 2
             AND wp.deleted_at IS NULL
             AND wp.organization_id IN (${orgListSql})${deptCond}
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d   ON d.id = wp.department_id
      LEFT JOIN positions p     ON p.id = wp.position_id
      LEFT JOIN LATERAL (
        SELECT te1.direction, te1.auth_type, te1.event_date_and_time AS last_event
        FROM terminal_events te1
        WHERE te1.worker_id = workers.id
          AND te1.event_date_and_time >= ${startOfDay}
          AND te1.event_date_and_time <  ${endOfDay}
        ORDER BY te1.event_date_and_time DESC
        LIMIT 1
      ) AS te ON TRUE
      WHERE workers.deleted_at IS NULL${searchCond}${dirCond}${authCond}
    `;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        SELECT DISTINCT ON (workers.id)
          workers.id AS worker_id,
          workers.last_name, workers.first_name, workers.middle_name, workers.photo,
          te.last_event, te.direction,
          o.name AS organization_name,
          d.name AS department_name,
          p.name AS position_name
        ${fromJoinWhere}
        ORDER BY workers.id, te.last_event DESC NULLS LAST
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*) AS cnt FROM (
          SELECT DISTINCT workers.id ${fromJoinWhere}
        ) sub
      `),
    ]);

    const rows = rowsOf(rowsRes);
    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);

    const data = await Promise.all(
      rows.map(async (r: any) => ({
        id: Number(r.worker_id),
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        photo: await this.minio.fileUrl(r.photo ?? null),
        last_event: r.last_event,
        direction: r.direction,
        organization_name: r.organization_name,
        department_name: r.department_name,
        position_name: r.position_name,
      })),
    );

    return { current_page: page, total, data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: not_come (absent workers today) — AbsentWorkersResource.
  // ────────────────────────────────────────────────────────────────────────
  async absentWorkersTodayPreview(q: PreviewQuery) {
    const { page, perPage, offset } = pageOf(q);
    const date = parseDate(q.date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) return emptyPaginate(page);

    const searchCond = q.search
      ? sql` AND CONCAT(w.last_name, ' ', w.first_name, ' ', w.middle_name) ILIKE ${`%${q.search}%`}`
      : sql``;
    const deptCond =
      deptCsv.length > 0
        ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})`
        : sql``;

    // Card stats-one bilan IDENTICAL FROM/WHERE — joinlar minimal.
    // org/dept/pos info'larini keyin rows query'sida olamiz.
    const baseSql = sql`
      FROM workers w
      LEFT JOIN worker_positions wp ON w.id = wp.worker_id
      LEFT JOIN turnstile_worker_schedules st
             ON wp.id = st.worker_position_id
            AND st.date = ${date}::date
      LEFT JOIN terminal_events te
             ON w.id = te.worker_id
            AND te.event_date_and_time >= ${startOfDay}
            AND te.event_date_and_time <  ${endOfDay}
      LEFT JOIN vacations v
             ON w.id = v.worker_id
            AND v.from <= ${date}::date
            AND v.to >= ${date}::date
            AND v.deleted_at IS NULL
      WHERE w.id NOT IN (${sqlIdList([...TURNSTILE_WHITELIST])})
        AND wp.is_turnstile = TRUE
        AND wp.status = 2
        AND wp.deleted_at IS NULL
        AND wp.organization_id IN (${sqlIdList(allowedIds)})${deptCond}
        AND v.worker_id IS NULL
        AND w.deleted_at IS NULL${searchCond}
    `;

    // Card stats-one bilan IDENTICAL count uchun: SELECT DISTINCT (w.id, status).
    // Preview rows uchun: shu subSelect'dan w.id + status'ni olib, alohida
    // JOIN bilan worker/org/dept/pos info'ni qo'shamiz (DISTINCT ON (w.id, status)).
    const subSelect = sql`
      SELECT DISTINCT w.id AS worker_id,
        CASE
          WHEN st.worker_id IS NOT NULL
               AND NOW() >= (st.date + st.start_time::interval)
               AND te.worker_id IS NULL
            THEN 'scheduled_absent'
          WHEN st.worker_id IS NULL
               AND te.worker_id IS NULL
               AND EXTRACT(ISODOW FROM NOW()) NOT IN (6,7)
            THEN 'no_schedule_absent'
          ELSE 'present'
        END AS status
      ${baseSql}
    `;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        WITH absents AS (${subSelect})
        SELECT DISTINCT ON (a.worker_id, a.status)
          a.worker_id, a.status,
          w.last_name, w.first_name, w.middle_name, w.photo,
          o.name AS organization_name,
          d.name AS department_name,
          p.name AS position_name
        FROM absents a
        INNER JOIN workers w ON w.id = a.worker_id
        LEFT JOIN worker_positions wp ON wp.worker_id = w.id
                                     AND wp.status = 2
                                     AND wp.deleted_at IS NULL
                                     AND wp.is_turnstile = TRUE
        LEFT JOIN organizations o ON o.id = wp.organization_id
        LEFT JOIN departments d ON d.id = wp.department_id
        LEFT JOIN positions p ON p.id = wp.position_id
        WHERE a.status IN ('no_schedule_absent', 'scheduled_absent')
        ORDER BY a.worker_id, a.status
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*) AS cnt FROM (${subSelect}) sub
        WHERE status IN ('no_schedule_absent', 'scheduled_absent')
      `),
    ]);

    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);
    const rows = rowsOf(rowsRes);
    const data = await Promise.all(
      rows.map(async (r: any) => ({
        id: Number(r.worker_id),
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        photo: await this.minio.fileUrl(r.photo ?? null),
        organization_name: r.organization_name,
        department_name: r.department_name,
        position_name: r.position_name,
        status: r.status,
      })),
    );
    return { current_page: page, total, data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: late_come / early_leave — Late/EarlyResource.
  // ────────────────────────────────────────────────────────────────────────
  async lateComePreview(q: PreviewQuery) {
    return this.lateOrEarlyPreview(q, 'late');
  }

  async earlyLeavePreview(q: PreviewQuery) {
    return this.lateOrEarlyPreview(q, 'early');
  }

  private async lateOrEarlyPreview(q: PreviewQuery, mode: 'late' | 'early') {
    const { page, perPage, offset } = pageOf(q);
    const date = parseDate(q.date);
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${addDays(date, 1)} 00:00:00`;
    const allowedIds = await this.effectiveOrgIds(q);
    const deptCsv = parseCsvInts(q.departments);
    if (allowedIds.length === 0) return emptyPaginate(page);

    const deptCond =
      deptCsv.length > 0
        ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})`
        : sql``;

    // mode-specific SQL.
    const timeCol =
      mode === 'late'
        ? sql`turnstile_worker_schedules.start_time`
        : sql`turnstile_worker_schedules.end_time`;
    const teOrder = mode === 'late' ? sql`ASC` : sql`DESC`;
    const teDirection = mode === 'late' ? sql`TRUE` : sql`FALSE`;
    const teAlias = mode === 'late' ? 'te_first' : 'te_last';
    const minuteExpr =
      mode === 'late'
        ? sql`EXTRACT(EPOCH FROM (${sql.raw(teAlias)}.event_date_and_time::time - ${timeCol})) / 60`
        : sql`EXTRACT(EPOCH FROM (${timeCol} - ${sql.raw(teAlias)}.event_date_and_time::time)) / 60`;
    const minuteKey = mode === 'late' ? 'delay_minutes' : 'early_minutes';
    const whereTimeCmp =
      mode === 'late'
        ? sql`${sql.raw(teAlias)}.event_date_and_time::time > ${timeCol}`
        : sql`${sql.raw(teAlias)}.event_date_and_time::time < ${timeCol}`;
    const startCheck =
      mode === 'late'
        ? sql` AND turnstile_worker_schedules.start_time IS NOT NULL
              AND turnstile_worker_schedules.start_time != '00:00:00'`
        : sql` AND turnstile_worker_schedules.end_time IS NOT NULL`;

    const fromJoinWhere = sql`
      FROM turnstile_worker_schedules
      INNER JOIN workers w ON turnstile_worker_schedules.worker_id = w.id
      LEFT JOIN worker_positions wp ON turnstile_worker_schedules.worker_position_id = wp.id
      LEFT JOIN positions p ON wp.position_id = p.id
      LEFT JOIN departments d ON wp.department_id = d.id
      LEFT JOIN organizations o ON wp.organization_id = o.id
      INNER JOIN LATERAL (
        SELECT te.event_date_and_time, te.direction
        FROM terminal_events te
        WHERE te.worker_id = turnstile_worker_schedules.worker_id
          AND te.event_date_and_time >= ${startOfDay}
          AND te.event_date_and_time <  ${endOfDay}
        ORDER BY te.event_date_and_time ${teOrder}
        LIMIT 1
      ) ${sql.raw(teAlias)} ON ${sql.raw(teAlias)}.direction = ${teDirection}
      WHERE w.id NOT IN (${sqlIdList([...TURNSTILE_WHITELIST])})
        AND wp.status = 2 AND wp.deleted_at IS NULL
        AND wp.is_turnstile = TRUE
        AND wp.organization_id IN (${sqlIdList(allowedIds)})${deptCond}
        AND turnstile_worker_schedules.date = ${date}::date
        AND turnstile_worker_schedules.work_status = 1
        ${startCheck}
        AND ${whereTimeCmp}
    `;

    // Note: GROUP BY is needed because of the JOINs producing duplicates.
    const groupCols = sql`turnstile_worker_schedules.worker_id, w.first_name, w.last_name, w.middle_name, w.photo, wp.position_id, p.name, d.name, o.name, ${timeCol}, ${sql.raw(teAlias)}.event_date_and_time`;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        SELECT
          turnstile_worker_schedules.worker_id,
          w.first_name, w.last_name, w.middle_name, w.photo,
          p.name AS position_name, d.name AS department_name, o.name AS organization_name,
          ${timeCol} AS time_value,
          ${sql.raw(teAlias)}.event_date_and_time AS event_time,
          ${minuteExpr} AS minutes
        ${fromJoinWhere}
        GROUP BY ${groupCols}
        ORDER BY minutes DESC, w.last_name, w.first_name
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*) AS cnt FROM (
          SELECT 1 ${fromJoinWhere}
          GROUP BY ${groupCols}
        ) sub
      `),
    ]);

    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);
    const rows = rowsOf(rowsRes);
    const data = await Promise.all(
      rows.map(async (r: any) => {
        const base = {
          id: Number(r.worker_id),
          last_name: r.last_name,
          first_name: r.first_name,
          middle_name: r.middle_name,
          photo: await this.minio.fileUrl(r.photo ?? null),
          organization_name: r.organization_name,
          department_name: r.department_name,
          position_name: r.position_name,
        };
        if (mode === 'late') {
          return {
            ...base,
            start_time: r.time_value,
            first_entry_time: r.event_time,
            minutes: Math.round(Number(r.minutes ?? 0)),
          };
        }
        return {
          ...base,
          end_time: r.time_value,
          last_exit_time: r.event_time,
          [minuteKey]: Math.round(Number(r.minutes ?? 0)),
        };
      }),
    );
    return { current_page: page, total, data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: online_devices / offline_devices — DevicesResource.
  // ────────────────────────────────────────────────────────────────────────
  // Laravel bug: id = $this->worker_id (HCPDevice has no worker_id → null).
  async devicesPreview(q: PreviewQuery, online: boolean) {
    const { page, perPage, offset } = pageOf(q);
    const allowedIds = await this.effectiveOrgIds(q);
    if (allowedIds.length === 0) return emptyPaginate(page);

    const searchCond = q.search
      ? sql` AND ${h_c_p_devices.name} ILIKE ${`%${q.search}%`}`
      : sql``;

    const where = and(
      notDeleted(h_c_p_devices),
      inArray(h_c_p_devices.organization_id, allowedIds),
      eq(h_c_p_devices.status, online),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db.execute(sql`
        SELECT
          d.id AS device_id,
          d.organization_id,
          d.name,
          d.status,
          d.serial_number,
          o.name AS organization_name
        FROM h_c_p_devices d
        LEFT JOIN organizations o ON o.id = d.organization_id
        WHERE d.deleted_at IS NULL
          AND d.organization_id IN (${sqlIdList(allowedIds)})
          AND d.status = ${online}${searchCond ? sql`` : sql``}
          ${q.search ? sql` AND d.name ILIKE ${`%${q.search}%`}` : sql``}
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.select({ total: count() }).from(h_c_p_devices).where(where),
    ]);

    const data = rowsOf(rows).map((r: any) => ({
      // Laravel bug: id = worker_id which doesn't exist on HCPDevice → null.
      id: null,
      area_name: r.name,
      status: r.status ? 1 : 2,
      organization_name: r.organization_name ?? null,
      serial_number: r.serial_number ?? '',
    }));

    return { current_page: page, total: Number(total), data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: vacations — VacationResource.
  // ────────────────────────────────────────────────────────────────────────
  async vacationsPreview(q: PreviewQuery) {
    const { page, perPage, offset } = pageOf(q);
    const date = parseDate(q.date);
    const lang = this.ctx.lang;
    const allowedIds = await this.effectiveOrgIds(q);
    if (allowedIds.length === 0) return emptyPaginate(page);
    const deptCsv = parseCsvInts(q.departments);

    // Laravel: Vacation->whereIn('worker_id', WorkerPosition::filter->select('worker_id'))
    //   ->whereDate('to', '>=', $date)->orderByDesc('to')->paginate
    const workerIdSubq = sql`(
      SELECT wp.worker_id FROM worker_positions wp
       WHERE wp.status = 2 AND wp.deleted_at IS NULL
         AND wp.organization_id IN (${sqlIdList(allowedIds)})
         ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
    )`;

    const searchCond = q.search
      ? sql` AND EXISTS (
          SELECT 1 FROM workers w
           WHERE w.id = v.worker_id
             AND CONCAT(w.last_name, ' ', w.first_name, ' ', w.middle_name) ILIKE ${`%${q.search}%`}
        )`
      : sql``;

    const fromWhere = sql`
      FROM vacations v
      WHERE v.deleted_at IS NULL
        AND v.worker_id IN ${workerIdSubq}
        AND v.to >= ${date}::date${searchCond}
    `;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        SELECT v.id, v.worker_id, v.worker_position_id, v.type, v.from, v.to, v.all_day
        ${fromWhere}
        ORDER BY v.to DESC
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`SELECT COUNT(*) AS cnt ${fromWhere}`),
    ]);
    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);
    const rows = rowsOf(rowsRes);

    if (rows.length === 0) return { current_page: page, total, data: [] };

    // Batch-load worker_position relations.
    const wpIds = [
      ...new Set(
        rows.map((r: any) => Number(r.worker_position_id)).filter(Boolean),
      ),
    ];
    const wpDetails = await this.loadWorkerPositionsMinimal(wpIds);

    const data = await Promise.all(
      rows.map(async (r: any) => {
        const wp = wpDetails.get(Number(r.worker_position_id));
        return {
          id: Number(r.id),
          worker_position: wp ? await this.mapWpMinimal(wp, lang) : null,
          type: {
            id: r.type,
            name: this.translate(
              `messages.vacations.types.${vacationTypeKey(r.type)}`,
              lang,
            ),
          },
          from: r.from,
          to: r.to,
          all_day: r.all_day,
        };
      }),
    );

    return { current_page: page, total, data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: not_passed_turnstile_workers — NotPassedWorkersResource.
  // ────────────────────────────────────────────────────────────────────────
  async notPassedTurnstilePreview(q: PreviewQuery) {
    return this.workerPositionPreview(q, {
      extraCond: sql`AND wp.is_turnstile = FALSE`,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: privilege_turnstile_workers — PrivilegeWorkersResource.
  //
  // NOTE: Laravel `->where('start', '!=', 0)->orWhere('end', '!=', 0)` SQL'da
  // top-level OR sifatida ulanadi (parens'siz) → SCOPE filterlarini buzadi va
  // 244 row qaytaradi. Lekin dashboard CARD (stats-six) PROPER grouping
  // ishlatadi va 216 qaytaradi. UX consistency uchun preview'ni card'ga
  // tenglashtirib, proper grouping ishlatamiz.
  // ────────────────────────────────────────────────────────────────────────
  async privilegeTurnstilePreview(q: PreviewQuery) {
    // Laravel: ->where('start_minute','!=',0)->orWhere('end_minute','!=',0)
    // guruhlanmagan → `(barcha AND start!=0) OR (end!=0)`. end!=0 rowlari
    // scope/status/deleted shartlaridan "qochadi" (Laravel xulqi — parity).
    return this.workerPositionPreview(q, {
      extraCond: sql`AND wp.turnstile_privilege_start_minute != 0`,
      trailingOr: sql` OR wp.turnstile_privilege_end_minute != 0`,
      extraFields: [
        'turnstile_privilege_start_minute',
        'turnstile_privilege_end_minute',
      ],
      extraMap: (r) => ({
        start_minute: r.turnstile_privilege_start_minute,
        end_minute: r.turnstile_privilege_end_minute,
      }),
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: notIncludedSchedule — NotIncludedWorkersResource.
  //
  // NOTE: Original Laravel preview uses single-date check (whereDate('date', $date))
  // without is_turnstile/vacation filters → 63507 rows. But the dashboard CARD
  // (stats-two=scheduleStatsByMonth) uses monthly + is_turnstile + vacation filters
  // → 51770. UX-da bu chalg'itadi (51770 ko'rsatilib, 63507 chiqsa).
  // Bizning yondashuv (developer talabi): preview'ni CARD filteriga keltirish.
  // ────────────────────────────────────────────────────────────────────────
  async notIncludedSchedulePreview(q: PreviewQuery) {
    // Laravel: WorkerPosition::filter(...)->whereDoesntHave('scheduleDays',
    // whereDate('date', $date)) — aniq sana uchun jadvali yo'q pozitsiyalar.
    // is_turnstile / oy-oralig'i / vacation shartlari Laravel'da YO'Q.
    const date = parseDate(q.date);
    return this.workerPositionPreview(q, {
      extraCond: sql`
        AND wp.id NOT IN (
          SELECT ts.worker_position_id FROM turnstile_worker_schedules ts
           WHERE ts.date = ${date} AND ts.deleted_at IS NULL
        )
      `,
    });
  }

  // Generic WorkerPosition-based preview helper for not_passed/privilege/notIncluded.
  private async workerPositionPreview(
    q: PreviewQuery,
    opts: {
      extraCond: ReturnType<typeof sql>;
      extraFields?: string[];
      extraMap?: (r: any) => Record<string, unknown>;
      // Laravel guruhlanmagan orWhere parity — searchCond'dan keyin qo'shiladi,
      // butun AND-guruhni OR bilan bog'laydi: `(... ) OR (trailingOr)`.
      trailingOr?: ReturnType<typeof sql>;
    },
  ) {
    const { page, perPage, offset } = pageOf(q);
    const allowedIds = await this.effectiveOrgIds(q);
    if (allowedIds.length === 0) return emptyPaginate(page);
    const deptCsv = parseCsvInts(q.departments);
    const searchCond = q.search
      ? sql` AND EXISTS (
          SELECT 1 FROM workers w
           WHERE w.id = wp.worker_id
             AND CONCAT(w.last_name, ' ', w.first_name, ' ', w.middle_name) ILIKE ${`%${q.search}%`}
        )`
      : sql``;

    const extras = (opts.extraFields ?? []).map((f) => `, wp.${f}`).join('');

    const fromWhere = sql`
      FROM worker_positions wp
      LEFT JOIN workers w ON w.id = wp.worker_id
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      WHERE wp.status = 2 AND wp.deleted_at IS NULL
        AND wp.organization_id IN (${sqlIdList(allowedIds)})
        ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
        ${opts.extraCond}${searchCond}${opts.trailingOr ?? sql``}
    `;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        SELECT
          wp.id,
          w.last_name, w.first_name, w.middle_name, w.photo,
          o.name AS organization_name,
          d.name AS department_name,
          p.name AS position_name
          ${sql.raw(extras)}
        ${fromWhere}
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`SELECT COUNT(*) AS cnt ${fromWhere}`),
    ]);

    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);
    const rows = rowsOf(rowsRes);
    const data = await Promise.all(
      rows.map(async (r: any) => {
        const base = {
          id: Number(r.id),
          last_name: r.last_name,
          first_name: r.first_name,
          middle_name: r.middle_name,
          photo: await this.minio.fileUrl(r.photo ?? null),
          organization_name: r.organization_name,
          department_name: r.department_name,
          position_name: r.position_name,
        };
        return { ...base, ...(opts.extraMap?.(r) ?? {}) };
      }),
    );
    return { current_page: page, total, data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: casual_workers — CasualWorkersResource.
  // ────────────────────────────────────────────────────────────────────────
  async casualWorkersPreview(q: PreviewQuery) {
    const { page, perPage, offset } = pageOf(q);
    const date = parseDate(q.date);
    const allowedIds = await this.effectiveOrgIds(q);
    if (allowedIds.length === 0) return emptyPaginate(page);
    const deptCsv = parseCsvInts(q.departments);

    const searchCond = q.search
      ? sql` AND CONCAT(w.last_name, ' ', w.first_name, ' ', w.middle_name) ILIKE ${`%${q.search}%`}`
      : sql``;

    const fromWhere = sql`
      FROM turnstile_worker_schedules ts
      INNER JOIN workers w ON w.id = ts.worker_id
      INNER JOIN worker_positions wp ON wp.id = ts.worker_position_id
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      WHERE ts.date = ${date}::date
        AND ts.work_status = 0
        AND wp.organization_id IN (${sqlIdList(allowedIds)})
        ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}${searchCond}
    `;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        SELECT
          ts.id, w.last_name, w.first_name, w.middle_name, w.photo,
          o.name AS organization_name, d.name AS department_name, p.name AS position_name
        ${fromWhere}
        ORDER BY ts.id DESC
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`SELECT COUNT(*) AS cnt ${fromWhere}`),
    ]);

    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);
    const rows = rowsOf(rowsRes);
    const data = await Promise.all(
      rows.map(async (r: any) => ({
        id: Number(r.id),
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        photo: await this.minio.fileUrl(r.photo ?? null),
        organization_name: r.organization_name,
        department_name: r.department_name,
        position_name: r.position_name,
      })),
    );
    return { current_page: page, total, data };
  }

  // ────────────────────────────────────────────────────────────────────────
  // PREVIEW: daily_attendance — terminal_events list with EventListResource.
  // ────────────────────────────────────────────────────────────────────────
  async dailyAttendancePreview(q: PreviewQuery) {
    const { page, perPage, offset } = pageOf(q);
    const date = parseDate(q.date);
    const startTime = `${date} ${q.start_time ?? '00:00'}:00`;
    const endTime = `${date} ${q.end_time ?? '23:59'}:00`;
    const allowedIds = await this.effectiveOrgIds(q);
    if (allowedIds.length === 0) return { events: emptyPaginate(page) };
    const deptCsv = parseCsvInts(q.departments);

    const dirFilter =
      q.direction != null
        ? sql` AND te.direction = ${Number(q.direction) === 1}`
        : sql``;

    const fromWhere = sql`
      FROM terminal_events te
      WHERE te.worker_id IN (
        SELECT DISTINCT wp.worker_id FROM worker_positions wp
         WHERE wp.status = 2 AND wp.deleted_at IS NULL
           AND wp.organization_id IN (${sqlIdList(allowedIds)})
           ${deptCsv.length > 0 ? sql` AND wp.department_id IN (${sqlIdList(deptCsv)})` : sql``}
      )
        AND te.event_date_and_time::date = ${date}::date
        AND te.event_date_and_time >= ${startTime}
        AND te.event_date_and_time <= ${endTime}${dirFilter}
    `;

    const [rowsRes, cntRes] = await Promise.all([
      this.db.execute(sql`
        SELECT te.id, te.worker_id, te.event_date_and_time, te.direction, te.auth_type
        ${fromWhere}
        ORDER BY te.event_date_and_time DESC
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`SELECT COUNT(*) AS cnt ${fromWhere}`),
    ]);
    const total = num((rowsOf(cntRes)[0] as { cnt?: number })?.cnt);
    const rows = rowsOf(rowsRes);

    const wIds = [
      ...new Set(rows.map((r: any) => Number(r.worker_id)).filter(Boolean)),
    ];
    const workersInfo = wIds.length
      ? await this.db
          .select({
            id: workers.id,
            last_name: workers.last_name,
            first_name: workers.first_name,
            middle_name: workers.middle_name,
            photo: workers.photo,
            birthday: workers.birthday,
          })
          .from(workers)
          .where(inArray(workers.id, wIds))
      : [];
    const wMap = new Map<
      number,
      (typeof workersInfo)[number] & { photoUrl?: string | null }
    >();
    for (const w of workersInfo) {
      wMap.set(w.id, { ...w, photoUrl: await this.minio.fileUrl(w.photo) });
    }

    const data = rows.map((r: any) => {
      const w = wMap.get(Number(r.worker_id));
      return {
        id: Number(r.id),
        event_date_and_time: r.event_date_and_time,
        direction: r.direction,
        auth_type: r.auth_type,
        worker: w
          ? {
              id: w.id,
              last_name: w.last_name,
              first_name: w.first_name,
              middle_name: w.middle_name,
              photo: w.photoUrl,
              birthday: w.birthday,
            }
          : null,
      };
    });

    return { events: { current_page: page, total, data } };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Helper — load worker_positions minimal info with worker + org + dept + pos.
  // ────────────────────────────────────────────────────────────────────────
  private async loadWorkerPositionsMinimal(ids: number[]) {
    if (ids.length === 0) return new Map<number, WpMinimal>();
    const rows = await this.db.execute(sql`
      SELECT
        wp.id,
        w.id AS worker_id, w.last_name, w.first_name, w.middle_name, w.photo,
        o.id AS org_id, o.name AS org_name, o.name_ru AS org_name_ru,
          o.name_en AS org_name_en, o.full_name AS org_full_name,
          COALESCE(o.group, FALSE) AS org_group,
        d.name AS dept_name, d.level AS dept_level,
        p.name AS position_name
      FROM worker_positions wp
      LEFT JOIN workers w ON w.id = wp.worker_id
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      WHERE wp.id IN (${sqlIdList(ids)})
    `);
    const map = new Map<number, WpMinimal>();
    for (const r of rowsOf(rows) as any[]) {
      map.set(Number(r.id), {
        id: Number(r.id),
        worker_id: r.worker_id != null ? Number(r.worker_id) : null,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        photo: r.photo,
        org_id: r.org_id != null ? Number(r.org_id) : null,
        org_name: r.org_name,
        org_name_ru: r.org_name_ru,
        org_name_en: r.org_name_en,
        org_full_name: r.org_full_name,
        org_group: r.org_group,
        dept_name: r.dept_name,
        dept_level: r.dept_level != null ? Number(r.dept_level) : null,
        position_name: r.position_name,
      });
    }
    return map;
  }

  private async mapWpMinimal(wp: WpMinimal, lang: string) {
    return {
      id: wp.id,
      worker: wp.worker_id
        ? {
            id: wp.worker_id,
            photo: await this.minio.fileUrl(wp.photo),
            last_name: wp.last_name,
            first_name: wp.first_name,
            middle_name: wp.middle_name,
          }
        : null,
      organization: wp.org_id
        ? {
            id: wp.org_id,
            name:
              lang === 'ru'
                ? (wp.org_name_ru ?? wp.org_name)
                : lang === 'en'
                  ? (wp.org_name_en ?? wp.org_name)
                  : wp.org_name,
            group: wp.org_group ?? false,
          }
        : null,
      post_name: getFullPositionFromMin(wp),
      post_short_name: getShortPositionFromMin(wp),
    };
  }

  private translate(key: string, lang: string): string {
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' && v !== key ? v : '';
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────────────────────────────

  // childIds ∩ request.organizations CSV ∩ organization_id (Laravel
  // QueryHelper::filterByOrganizations parity).
  private async effectiveOrgIds(q: StatsQuery): Promise<number[]> {
    const childIds = await this.scope.ids();
    let result = childIds;
    if (q.organizations) {
      const csvIds = parseCsvInts(q.organizations);
      if (csvIds.length > 0) {
        const set = new Set(csvIds);
        result = result.filter((id) => set.has(id));
      }
    }
    const single =
      q.organization_id != null ? Number(q.organization_id) : undefined;
    if (Number.isInteger(single) && single! > 0) {
      result = result.filter((id) => id === single);
    }
    return result;
  }

  private async devicesCounts(allowedIds: number[]) {
    if (allowedIds.length === 0) {
      return { all: 0, online: 0, offline: 0 };
    }
    const where = and(
      notDeleted(h_c_p_devices),
      inArray(h_c_p_devices.organization_id, allowedIds),
    );
    const [{ total: all }] = await this.db
      .select({ total: count() })
      .from(h_c_p_devices)
      .where(where);
    const [{ total: online }] = await this.db
      .select({ total: count() })
      .from(h_c_p_devices)
      .where(and(where, eq(h_c_p_devices.status, true)));
    const allN = Number(all);
    const onlineN = Number(online);
    return { all: allN, online: onlineN, offline: allN - onlineN };
  }

  private async totalWorkersForCurrentOrg(): Promise<number> {
    const ids = await this.scope.ids();
    if (ids.length === 0) return 0;
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(worker_positions)
      .where(
        and(
          notDeleted(worker_positions),
          eq(worker_positions.status, 2),
          inArray(worker_positions.organization_id, ids),
        ),
      );
    return Number(total);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────

function pageOf(q: { page?: number | string; per_page?: number | string }) {
  const page = Number(q.page ?? 1);
  const perPage = Number(q.per_page ?? 10);
  return { page, perPage, offset: (page - 1) * perPage };
}

function emptyPaginate(page: number) {
  return { current_page: page, total: 0, data: [] as Array<unknown> };
}

// Laravel PositionHelper::getFullPosition parity (CENTER_LEVEL=1 → no dept).
function getFullPositionFromMin(wp: WpMinimal): string {
  if (!wp.position_name) return '';
  const parts: string[] = [];
  if (wp.org_full_name) parts.push(wp.org_full_name);
  if (wp.dept_name && wp.dept_level !== 1) parts.push(wp.dept_name);
  parts.push(wp.position_name);
  return parts.join(' ').trim();
}

// Laravel PositionHelper::getShortPosition — dept + position (no org).
function getShortPositionFromMin(wp: WpMinimal): string {
  if (!wp.position_name) return '';
  if (wp.dept_level === 1 || !wp.dept_name) return wp.position_name;
  return `${wp.dept_name} ${wp.position_name}`.trim();
}

function parseDate(d: string | undefined): string {
  if (d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function monthStartOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function monthEndOf(date: string): string {
  const [y, m] = date.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(y, m, 1));
  nextMonth.setUTCDate(nextMonth.getUTCDate() - 1);
  return nextMonth.toISOString().slice(0, 10);
}

function parseCsvInts(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function sqlIdList(ids: readonly number[]): ReturnType<typeof sql.join> {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function zeroStatsOne() {
  return {
    totalWorkers: 0,
    scheduled_workers_today: 0,
    attended_workers_today: 0,
    absent_workers_today: 0,
  };
}

function emptyCurrentEvents() {
  return {
    current_in: 0,
    current_out: 0,
    top_in_workers: [] as Array<unknown>,
    top_out_workers: [] as Array<unknown>,
  };
}

function zeroStatsSix() {
  return {
    not_passed_turnstile_workers_count: 0,
    privilege_turnstile_workers_count: 0,
    vacation_workers: { total: 0 },
    casual_workers: 0,
  };
}
