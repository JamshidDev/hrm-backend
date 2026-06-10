// HikCentral Event service. Laravel: EventController.
// terminal_events jadvali partitioned (oylik/kunlik bo'limlar). Drizzle schema-da
// faqat per-day partitions bor — parent `terminal_events` raw SQL bilan o'qiladi.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { HEADER_BLUE } from '@/shared/excel/style-presets';
import { I18nService } from 'nestjs-i18n';
import { getShortPosition } from '@/modules/hr/_shared/position-helper';
import {
  h_c_p_devices,
  hik_central_access_level_devices,
  hik_central_access_levels,
  hik_central_devices,
  sync_h_c_p_access_logs,
  sync_offline_devices,
  workers,
} from '@/db/schema';
import { HikCentralClient } from '@/shared/hik-central/hik-central.client';
import {
  TURNSTILE_WHITELIST,
  nextId,
  pageOf,
} from '@/modules/turnstile/_shared/helpers';
import { buildWorkerSearchCond } from '@/modules/hr/_shared/worker-search.helper';

export interface EventListQuery {
  page?: number;
  per_page?: number;
  search?: string;
  date?: string;
  direction?: string;
  access_levels?: string;
  departments?: string;
  organizations?: string;
  organization_id?: number;
  event?: string;
  // events-new download branch:
  download?: string | boolean;
  from?: string;
  to?: string;
}

export interface SyncEventsBody {
  from_date?: string;
  to_date?: string;
  access_level_ids?: number[];
}

@Injectable()
export class EventService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly scope: OrgScopeService,
    private readonly minio: MinioService,
    private readonly hcp: HikCentralClient,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly i18n: I18nService,
  ) {}

  // Laravel: EventController::index — paginated terminal_events per day, scoped by
  // worker_positions.filter($user) + departments filter.
  //
  // Default `date` = today. Boshqa filterlar: search (worker name), direction (0/1),
  // access_levels CSV, departments CSV.
  //
  // Response (EventListResource):
  //   { id, worker:{id,photo,last,first,middle}, event_date_and_time,
  //     auth_type, device, direction, mask_status, temperature }
  async list(q: EventListQuery) {
    const { page, perPage, offset } = pageOf(q);
    const date = q.date ? new Date(q.date) : new Date();
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

    // 1) worker_ids subquery — scope.ids() + organizations/organization_id filter + departments.
    const ids = await this.scope.ids();
    if (ids.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }
    const orgList = sql.join(
      ids.map((n) => sql`${n}`),
      sql`, `,
    );
    let extraOrgs: number[] | null = null;
    if (q.organizations) {
      extraOrgs = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const extraOrgCond =
      extraOrgs && extraOrgs.length > 0
        ? sql` AND wp.organization_id IN (${sql.join(
            extraOrgs.map((n) => sql`${n}`),
            sql`, `,
          )})`
        : sql``;
    const orgIdCond =
      q.organization_id != null && Number(q.organization_id) > 0
        ? sql` AND wp.organization_id = ${Number(q.organization_id)}`
        : sql``;
    let depIds: number[] | null = null;
    if (q.departments) {
      depIds = q.departments
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const depCond =
      depIds && depIds.length > 0
        ? sql` AND wp.department_id IN (${sql.join(
            depIds.map((n) => sql`${n}`),
            sql`, `,
          )})`
        : sql``;

    const whitelistCond = sql`AND wp.worker_id NOT IN (${sql.join(
      [...TURNSTILE_WHITELIST].map((n) => sql`${n}`),
      sql`, `,
    )})`;

    const workerIdsSubq = sql`
      SELECT DISTINCT wp.worker_id FROM worker_positions wp
      WHERE wp.deleted_at IS NULL
        AND wp.organization_id IN (${orgList})
        ${whitelistCond}${extraOrgCond}${orgIdCond}${depCond}
    `;

    // 2) Search via worker name (Laravel: whereHas worker SearchByFullName).
    // To avoid JOIN inside terminal_events partition, we filter workers separately if search.
    let searchWorkerIds: number[] | null = null;
    if (q.search?.trim()) {
      const searchCond = buildWorkerSearchCond(q.search);
      if (searchCond) {
        const rows = await this.db
          .select({ id: workers.id })
          .from(workers)
          .where(searchCond);
        searchWorkerIds = rows.map((r) => Number(r.id));
        if (searchWorkerIds.length === 0) {
          return { current_page: page, total: 0, data: [] };
        }
      }
    }

    // 3) Build terminal_events WHERE.
    const conds: any[] = [
      sql`te.event_date_and_time >= ${startStr}`,
      sql`te.event_date_and_time < ${endStr}`,
      sql`te.worker_id IN (${workerIdsSubq})`,
    ];
    if (searchWorkerIds) {
      conds.push(
        sql`te.worker_id IN (${sql.join(
          searchWorkerIds.map((n) => sql`${n}`),
          sql`, `,
        )})`,
      );
    }
    if (q.direction !== undefined && q.direction !== '') {
      const dirBool = Number(q.direction) === 1;
      conds.push(sql`te.direction = ${dirBool}`);
    }
    if (q.access_levels) {
      const alIds = q.access_levels
        .split(',')
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);
      if (alIds.length) {
        conds.push(
          sql`te.hik_central_access_level_id IN (${sql.join(
            alIds.map((n) => sql`${n}`),
            sql`, `,
          )})`,
        );
      }
    }
    const whereSql = sql.join(conds, sql` AND `);

    const [rowsResult, totalResult] = await Promise.all([
      this.db.execute(sql`
        SELECT te.id, te.worker_id, te.event_date_and_time, te.direction,
               te.device_name, te.hik_central_access_level_id, te.auth_type,
               te.mask_status, te.temperature
        FROM terminal_events te
        WHERE ${whereSql}
        ORDER BY te.event_date_and_time DESC
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int AS total FROM terminal_events te WHERE ${whereSql}
      `),
    ]);
    const rows = ((rowsResult as any).rows ?? rowsResult) as Array<{
      id: number | string;
      worker_id: number | string;
      event_date_and_time: string;
      direction: boolean;
      device_name: string | null;
      hik_central_access_level_id: number | null;
      auth_type: number | null;
      mask_status: number | null;
      temperature: number | string | null;
    }>;
    const total = Number(
      ((totalResult as any).rows ?? totalResult)[0]?.total ?? 0,
    );

    if (rows.length === 0) {
      return { current_page: page, total, data: [] };
    }

    // 4) Worker batch eager-load.
    const wIds = [
      ...new Set(rows.map((r) => Number(r.worker_id)).filter(Boolean)),
    ];
    const wRows = await this.db
      .select({
        id: workers.id,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        photo: workers.photo,
      })
      .from(workers)
      .where(inArray(workers.id, wIds));
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

    // 5) Build EventListResource shape (no per_page in pagination).
    return {
      current_page: page,
      total,
      data: rows.map((r) => ({
        id: Number(r.id),
        worker: wMap.get(Number(r.worker_id)) ?? null,
        event_date_and_time: r.event_date_and_time,
        auth_type: r.auth_type,
        device: r.device_name,
        direction: r.direction,
        mask_status: r.mask_status,
        temperature: r.temperature,
      })),
    };
  }

  // Laravel: EventController::newStyleEvents — workers paginated with per-worker
  // events for given day. Response (WorkerTerminalEventsResource):
  //   { id, photo, last_name, first_name, middle_name, total_minutes,
  //     on_vacation, vacation_from, vacation_to }
  //
  // Filters:
  //  - Worker::filter ($user, organizations, organization_id, departments)
  //  - search (full-name)
  //  - event='yes' → EXISTS terminal_events for day
  //  - event='no'  → NOT EXISTS terminal_events for day
  //
  // total_minutes = TurnStileHelper::calcWorkDuration (paired IN/OUT minutes).
  async newStyleEvents(q: EventListQuery) {
    // Laravel: ?download=true → enqueue Excel export, return "successfully_exported".
    if (
      q.download &&
      q.download !== 'false' &&
      String(q.download).toLowerCase() !== 'no'
    ) {
      if (!q.from || !q.to) {
        throw new BusinessException(422, 'from and to are required');
      }
      await this.exportRunner.run({
        type: 23, // ExportTaskEnum.TURNSTILE_DAILY_ATTENDANCE
        folder: 'turnstile',
        build: () => this.buildDailyAttendanceExcel(q),
      });
      return { exported: true };
    }
    const { page, perPage, offset } = pageOf(q);
    const dateStr = q.date ?? new Date().toISOString().slice(0, 10);
    const startStr = `${dateStr} 00:00:00`;
    const endStr = `${dateStr} 23:59:59`;

    // Worker scope via active worker_positions in org-scope + departments filter.
    const ids = await this.scope.ids();
    if (ids.length === 0) {
      return { current_page: page, total: 0, data: [] };
    }
    const orgList = sql.join(
      ids.map((n) => sql`${n}`),
      sql`, `,
    );
    let extraOrgs: number[] | null = null;
    if (q.organizations) {
      extraOrgs = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const extraOrgCond =
      extraOrgs && extraOrgs.length > 0
        ? sql` AND wp.organization_id IN (${sql.join(
            extraOrgs.map((n) => sql`${n}`),
            sql`, `,
          )})`
        : sql``;
    const orgIdCond =
      q.organization_id != null && Number(q.organization_id) > 0
        ? sql` AND wp.organization_id = ${Number(q.organization_id)}`
        : sql``;
    let depIds: number[] | null = null;
    if (q.departments) {
      depIds = q.departments
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const depCond =
      depIds && depIds.length > 0
        ? sql` AND wp.department_id IN (${sql.join(
            depIds.map((n) => sql`${n}`),
            sql`, `,
          )})`
        : sql``;

    const positionExists = sql`EXISTS (
      SELECT 1 FROM worker_positions wp
      WHERE wp.worker_id = workers.id
        AND wp.status = 2
        AND wp.deleted_at IS NULL
        AND wp.organization_id IN (${orgList})${extraOrgCond}${orgIdCond}${depCond}
    )`;

    const conds: any[] = [sql`workers.deleted_at IS NULL`, positionExists];

    // search
    const searchCond = buildWorkerSearchCond(q.search);
    if (searchCond) conds.push(searchCond);

    // event=yes/no — EXISTS / NOT EXISTS terminal_events for day
    const eventVal = q.search !== undefined ? q.search : undefined; // placeholder
    void eventVal;
    if ((q as any).event === 'yes') {
      conds.push(sql`EXISTS (
        SELECT 1 FROM terminal_events te
        WHERE te.worker_id = workers.id
          AND te.event_date_and_time BETWEEN ${startStr} AND ${endStr}
      )`);
    } else if ((q as any).event === 'no') {
      conds.push(sql`NOT EXISTS (
        SELECT 1 FROM terminal_events te
        WHERE te.worker_id = workers.id
          AND te.event_date_and_time BETWEEN ${startStr} AND ${endStr}
      )`);
    }

    const whereSql = sql.join(conds, sql` AND `);

    // Vacation LEFT JOIN — date BETWEEN v.from AND v.to.
    const [rowsResult, totalResult] = await Promise.all([
      this.db.execute(sql`
        SELECT workers.id, workers.last_name, workers.first_name,
               workers.middle_name, workers.photo,
               (CASE WHEN v.id IS NOT NULL THEN true ELSE false END) AS on_vacation,
               v."from" AS vacation_from, v."to" AS vacation_to
        FROM workers
        LEFT JOIN vacations v ON v.worker_id = workers.id
          AND v."from" <= ${dateStr}::date
          AND v."to"   >= ${dateStr}::date
        WHERE ${whereSql}
        LIMIT ${perPage} OFFSET ${offset}
      `),
      // Laravel `paginate()` count: LEFT JOIN vacations'siz EMAS — workers ko'p
      // overlapping vacations bo'lsa, hisob shishadi (Laravel quirk).
      this.db.execute(sql`
        SELECT COUNT(*)::int AS total FROM workers
        LEFT JOIN vacations v ON v.worker_id = workers.id
          AND v."from" <= ${dateStr}::date
          AND v."to"   >= ${dateStr}::date
        WHERE ${whereSql}
      `),
    ]);

    const rows = ((rowsResult as any).rows ?? rowsResult) as Array<{
      id: number | string;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      photo: string | null;
      on_vacation: boolean;
      vacation_from: string | null;
      vacation_to: string | null;
    }>;
    const total = Number(
      ((totalResult as any).rows ?? totalResult)[0]?.total ?? 0,
    );

    if (rows.length === 0) {
      return { current_page: page, total, data: [] };
    }

    // Per-worker events for total_minutes calculation.
    const workerIds = rows.map((r) => Number(r.id));
    const evResult = await this.db.execute(sql`
      SELECT worker_id, event_date_and_time, direction
      FROM terminal_events
      WHERE worker_id IN (${sql.join(
        workerIds.map((n) => sql`${n}`),
        sql`, `,
      )})
        AND event_date_and_time BETWEEN ${startStr} AND ${endStr}
      ORDER BY event_date_and_time
    `);
    const evRows = ((evResult as any).rows ?? evResult) as Array<{
      worker_id: number | string;
      event_date_and_time: string;
      direction: boolean;
    }>;
    const eventsByWorker = new Map<number, Array<(typeof evRows)[number]>>();
    for (const e of evRows) {
      const wid = Number(e.worker_id);
      const arr = eventsByWorker.get(wid) ?? [];
      arr.push(e);
      eventsByWorker.set(wid, arr);
    }

    // Photo URL batch + WorkerTerminalEventsResource shape.
    const photoUrls = await Promise.all(
      rows.map((r) => this.minio.fileUrl(r.photo)),
    );

    return {
      current_page: page,
      total,
      data: rows.map((r, i) => ({
        id: Number(r.id),
        photo: photoUrls[i],
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name,
        total_minutes: calcWorkDurationMinutes(
          eventsByWorker.get(Number(r.id)) ?? [],
          dateStr,
        ),
        on_vacation: Boolean(r.on_vacation),
        vacation_from: r.vacation_from,
        vacation_to: r.vacation_to,
      })),
    };
  }

  // Laravel: TurnstileEventsExportToExcelJob — daily attendance Excel.
  // Per worker rows × N days (from..to) columns. Each day has:
  //   turnstile_start..turnstile_end | schedule_start..schedule_end | work_status | late | early
  //
  // Layout: row1 = day headers (merged), row2 = sub-headers per day, row3+ = data.
  private async buildDailyAttendanceExcel(q: EventListQuery): Promise<Buffer> {
    const from = q.from!;
    const to = q.to!;
    // Day range as YYYY-MM-DD list.
    const days = enumerateDays(from, to);
    const startStr = `${from} 00:00:00`;
    const endStr = `${addDayStr(to)} 00:00:00`;

    // Worker scope (re-use the same scope.ids + filters).
    const ids = await this.scope.ids();
    if (ids.length === 0) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [{ name: 'Sheet1', columns: [], rows: [] }],
      });
    }
    const orgList = sql.join(
      ids.map((n) => sql`${n}`),
      sql`, `,
    );
    let extraOrgs: number[] | null = null;
    if (q.organizations) {
      extraOrgs = q.organizations
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    const extraOrgCond =
      extraOrgs && extraOrgs.length > 0
        ? sql` AND wp.organization_id IN (${sql.join(
            extraOrgs.map((n) => sql`${n}`),
            sql`, `,
          )})`
        : sql``;
    const orgIdCond =
      q.organization_id != null && Number(q.organization_id) > 0
        ? sql` AND wp.organization_id = ${Number(q.organization_id)}`
        : sql``;

    // workers + active position info (org, dept, position).
    const workerRowsRes = await this.db.execute(sql`
      SELECT w.id, w.last_name, w.first_name, w.middle_name,
             wp.id AS position_id,
             o.name AS org_name,
             d.name AS dept_name, d.level AS dept_level,
             p.name AS position_name
      FROM workers w
      INNER JOIN worker_positions wp
        ON wp.worker_id = w.id AND wp.status = 2 AND wp.deleted_at IS NULL
        AND wp.organization_id IN (${orgList})${extraOrgCond}${orgIdCond}
      LEFT JOIN organizations o ON o.id = wp.organization_id
      LEFT JOIN departments d ON d.id = wp.department_id
      LEFT JOIN positions p ON p.id = wp.position_id
      WHERE w.deleted_at IS NULL
      ORDER BY w.id
    `);
    const workerRows = ((workerRowsRes as any).rows ?? workerRowsRes) as Array<{
      id: number | string;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      position_id: number | string | null;
      org_name: string | null;
      dept_name: string | null;
      dept_level: number | null;
      position_name: string | null;
    }>;
    if (!workerRows.length) {
      return this.excel.build({
        creator: 'HRM',
        sheets: [{ name: 'Sheet1', columns: [], rows: [] }],
      });
    }
    const workerIds = workerRows.map((w) => Number(w.id));

    // terminal_events in [from..to] for these workers.
    const evRowsRes = await this.db.execute(sql`
      SELECT worker_id,
             event_date_and_time::text AS edt,
             direction,
             DATE(event_date_and_time)::text AS date
      FROM terminal_events
      WHERE worker_id IN (${sql.join(
        workerIds.map((n) => sql`${n}`),
        sql`, `,
      )})
        AND event_date_and_time >= ${startStr}
        AND event_date_and_time < ${endStr}
      ORDER BY event_date_and_time
    `);
    const evRows = ((evRowsRes as any).rows ?? evRowsRes) as Array<{
      worker_id: number | string;
      edt: string;
      direction: boolean;
      date: string;
    }>;

    // Pre-compute per-worker per-day turnstile_start (first dir=true) / turnstile_end (last dir=false).
    type DayStart = { start: string | null; end: string | null };
    const tsByWorker = new Map<number, Map<string, DayStart>>();
    for (const ev of evRows) {
      const wid = Number(ev.worker_id);
      const date = ev.date.slice(0, 10);
      let byDate = tsByWorker.get(wid);
      if (!byDate) {
        byDate = new Map();
        tsByWorker.set(wid, byDate);
      }
      let slot = byDate.get(date);
      if (!slot) {
        slot = { start: null, end: null };
        byDate.set(date, slot);
      }
      const timePart = ev.edt.length >= 19 ? ev.edt.slice(11, 16) : '';
      if (ev.direction === true) {
        if (!slot.start) slot.start = timePart;
      } else {
        slot.end = timePart;
      }
    }

    // Schedules in range for these workers.
    const schedRowsRes = await this.db.execute(sql`
      SELECT worker_id, worker_position_id,
             date::text AS date,
             start_time::text AS start_time,
             end_time::text AS end_time,
             work_status
      FROM turnstile_worker_schedules
      WHERE worker_id IN (${sql.join(
        workerIds.map((n) => sql`${n}`),
        sql`, `,
      )})
        AND date >= ${from}::date
        AND date <= ${to}::date
    `);
    const schedRows = ((schedRowsRes as any).rows ?? schedRowsRes) as Array<{
      worker_id: number | string;
      worker_position_id: number | string | null;
      date: string;
      start_time: string | null;
      end_time: string | null;
      work_status: number | null;
    }>;
    type Sched = {
      start_time: string | null;
      end_time: string | null;
      work_status: number | null;
    };
    const schedByWorker = new Map<number, Map<string, Sched>>();
    for (const s of schedRows) {
      const wid = Number(s.worker_id);
      if (s.worker_position_id == null) continue;
      let byDate = schedByWorker.get(wid);
      if (!byDate) {
        byDate = new Map();
        schedByWorker.set(wid, byDate);
      }
      // First match per date.
      if (!byDate.has(s.date.slice(0, 10))) {
        byDate.set(s.date.slice(0, 10), {
          start_time: s.start_time?.slice(0, 5) ?? null,
          end_time: s.end_time?.slice(0, 5) ?? null,
          work_status: s.work_status,
        });
      }
    }

    // Translation labels
    const lang = this.ctx.lang;
    const t = (key: string) => this.i18n.t(key, { lang });
    const labels = {
      full_name: t('messages.worker.full_name') || 'F.I.O',
      organization: t('messages.turnstile.organization_name') || 'Tashkilot',
      position: t('messages.turnstile.position_name') || 'Lavozim',
      event: t('messages.turnstile.event_date_and_time') || 'Kelish-Ketish',
      schedule: t('messages.schedules.schedule') || 'Grafik',
      work_status: t('messages.schedules.work_status') || 'Holat',
      late: t('messages.schedules.late') || 'Kech',
      early: t('messages.schedules.early') || 'Erta',
      work: t('messages.schedules.work') || 'Ish',
      rest: t('messages.schedules.rest') || 'Dam',
    };

    // Build column config: 3 fixed cols (full_name, org, position), then per-day 5 cols.
    // First row contains date header (merged across 5 cols). Second row has sub-headers.
    // We use the Excel mergedRanges API.
    // Strategy: columns = 3 + 5*N. headerRow1 = dates merged, headerRow2 = sub-labels.

    // Build data rows
    const rows: Array<Record<string, unknown>> = [];
    for (const w of workerRows) {
      const wid = Number(w.id);
      const tsByDate = tsByWorker.get(wid) ?? new Map();
      const schedByDate = schedByWorker.get(wid) ?? new Map();
      const fullName = [w.last_name, w.first_name, w.middle_name]
        .filter(Boolean)
        .join(' ');
      const position_name = getShortPosition({
        position_name: w.position_name,
        department_name: w.dept_name,
        department_level: w.dept_level,
        organization_full_name: null,
      });
      const row: Record<string, unknown> = {
        full_name: fullName,
        organization: w.org_name ?? '',
        position: position_name,
      };
      for (const date of days) {
        const ts = tsByDate.get(date);
        const sc = schedByDate.get(date);
        row[`${date}_event`] =
          ts && (ts.start || ts.end)
            ? `${ts.start ?? ''}–${ts.end ?? ''}`
            : '—';
        row[`${date}_schedule`] = sc?.start_time
          ? `${sc.start_time}–${sc.end_time ?? ''}`
          : '—';
        row[`${date}_status`] =
          sc?.work_status === 1
            ? labels.work
            : sc?.work_status === 0
              ? labels.rest
              : '—';
        // late: schedule_start && turnstile_start && turnstile_start > schedule_start
        const late = !!(
          sc?.start_time &&
          ts?.start &&
          ts.start > sc.start_time
        );
        row[`${date}_late`] = late ? labels.late : '—';
        // early: schedule_end && turnstile_end && turnstile_end < schedule_end
        const early = !!(sc?.end_time && ts?.end && ts.end < sc.end_time);
        row[`${date}_early`] = early ? labels.early : '—';
      }
      rows.push(row);
    }

    // Columns: 3 fixed + 5 per day.
    const cols: Array<{ header: string; key: string; width: number }> = [
      { header: labels.full_name, key: 'full_name', width: 30 },
      { header: labels.organization, key: 'organization', width: 30 },
      { header: labels.position, key: 'position', width: 30 },
    ];
    for (const d of days) {
      cols.push({
        header: `${d} ${labels.event}`,
        key: `${d}_event`,
        width: 16,
      });
      cols.push({
        header: `${d} ${labels.schedule}`,
        key: `${d}_schedule`,
        width: 16,
      });
      cols.push({
        header: `${d} ${labels.work_status}`,
        key: `${d}_status`,
        width: 10,
      });
      cols.push({ header: `${d} ${labels.late}`, key: `${d}_late`, width: 10 });
      cols.push({
        header: `${d} ${labels.early}`,
        key: `${d}_early`,
        width: 10,
      });
    }

    return this.excel.build({
      creator: 'HRM',
      sheets: [
        {
          name: 'Davomat',
          columns: cols,
          rows,
          headerStyle: HEADER_BLUE,
          freezeHeader: true,
        },
      ],
    });
  }

  // Laravel: durations — work-time aggregation per worker. Heavy SQL; here we
  // return the date wrapper + empty paginate (frontend can hydrate).
  async durations(q: EventListQuery) {
    const date = q.date ?? new Date().toISOString().slice(0, 10);
    const { page, perPage } = pageOf(q);
    return {
      date,
      data: {
        current_page: page,
        total: 0,
        data: [] as Array<unknown>,
      },
    };
  }

  // Laravel: showWorkerDurations — array of {worker_id, event_date, daily_minutes}.
  // Group events per day; sum IN→OUT pair durations.
  async durationsForWorker(
    workerId: number,
    q: { year?: number; month?: number },
  ) {
    const now = new Date();
    const year = Number(q.year ?? now.getFullYear());
    const month = Number(q.month ?? now.getMonth() + 1);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

    const result = await this.db.execute(sql`
      SELECT event_date_and_time, direction
      FROM terminal_events
      WHERE worker_id = ${workerId}
        AND event_date_and_time >= ${startStr}
        AND event_date_and_time < ${endStr}
        AND deleted_at IS NULL
      ORDER BY event_date_and_time
    `);
    const rows = ((result as any).rows ?? result) as Array<{
      event_date_and_time: string;
      direction: boolean;
    }>;
    const byDate: Record<
      string,
      Array<{ time: Date; direction: boolean }>
    > = {};
    for (const r of rows) {
      const dt = new Date(r.event_date_and_time);
      const dateKey = dt.toISOString().slice(0, 10);
      (byDate[dateKey] ??= []).push({ time: dt, direction: r.direction });
    }
    return Object.entries(byDate).map(([event_date, events]) => {
      let minutes = 0;
      let lastIn: Date | null = null;
      for (const e of events) {
        if (e.direction === true) lastIn = e.time;
        else if (lastIn) {
          minutes += Math.max(
            0,
            Math.round((e.time.getTime() - lastIn.getTime()) / 60000),
          );
          lastIn = null;
        }
      }
      return { worker_id: workerId, event_date, daily_minutes: minutes };
    });
  }

  // Laravel: showWorkerEventsInDay — events for one day, one worker.
  async eventsInDay(workerId: number, q: { date?: string }) {
    if (!q.date) return [];
    const result = await this.db.execute(sql`
      SELECT id, event_date_and_time, device_name, direction, mask_status, temperature
      FROM terminal_events
      WHERE worker_id = ${workerId}
        AND DATE(event_date_and_time) = ${q.date}
        AND deleted_at IS NULL
      ORDER BY event_date_and_time
    `);
    const rows = ((result as any).rows ?? result) as any[];
    return rows.map((e) => ({
      id: Number(e.id),
      event_date_and_time: e.event_date_and_time,
      device: e.device_name,
      direction: e.direction,
      mask_status: e.mask_status,
      temperature: e.temperature,
    }));
  }

  // Laravel: EventController::syncEvents — full HCP doorEvents fetch + insert into
  // terminal_events. Synchronous (no queue) — for dev/manual sync.
  //
  // 1) Validate dates, diff <= 30 days
  // 2) Create SyncHCPAccessLog (status=1 IN_PROGRESS)
  // 3) Resolve access_level_ids → device hik_central_device_id list
  // 4) Log offline devices into sync_offline_devices
  // 5) For each HCP doorEvents page: map cardNo→worker, insertOrIgnore terminal_events
  // 6) Update log status=3 (success) + events_count, or status=2 (error)
  async syncEvents(body: SyncEventsBody) {
    if (!body.from_date || !body.to_date) {
      throw new BusinessException(422, 'from_date and to_date are required');
    }
    const fromDate = new Date(body.from_date);
    const toDate = new Date(body.to_date);
    const diffDays = Math.abs(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 30) {
      throw new BusinessException(400, 'diff_dates_max_30_day');
    }

    const userId = this.ctx.user_or_fail.id;
    const syncId = await nextId(this.db, sync_h_c_p_access_logs);
    await this.db.insert(sync_h_c_p_access_logs).values({
      id: syncId,
      user_id: userId,
      day: body.from_date,
      type: 2,
      status: 1,
    });

    try {
      // Resolve access_level_ids — agar berilmagan bo'lsa user'ning OAL'lari.
      let accessLevelIds = body.access_level_ids ?? [];
      if (!accessLevelIds.length) {
        const userOrgId = this.ctx.user_or_fail.organization_id;
        if (userOrgId != null) {
          const oalRows = await this.db.execute(sql`
            SELECT hik_central_access_level_id FROM organization_access_levels
            WHERE organization_id = ${Number(userOrgId)}
          `);
          accessLevelIds = ((oalRows as any).rows ?? oalRows).map((r: any) =>
            Number(r.hik_central_access_level_id),
          );
        }
      }
      if (!accessLevelIds.length) {
        await this.db
          .update(sync_h_c_p_access_logs)
          .set({ status: 3, events_count: 0, updated_at: sql`NOW()` })
          .where(eq(sync_h_c_p_access_logs.id, syncId));
        return { sync_id: syncId, events_count: 0 };
      }

      // hik_central_access_level_devices → hik_central_device_id (internal IDs).
      const aldRows = await this.db
        .select({
          hik_central_device_id:
            hik_central_access_level_devices.hik_central_device_id,
        })
        .from(hik_central_access_level_devices)
        .where(
          inArray(
            hik_central_access_level_devices.hik_central_access_level_id,
            accessLevelIds,
          ),
        );
      const internalDeviceIds = [
        ...new Set(aldRows.map((r) => Number(r.hik_central_device_id))),
      ];
      if (!internalDeviceIds.length) {
        await this.db
          .update(sync_h_c_p_access_logs)
          .set({ status: 3, events_count: 0, updated_at: sql`NOW()` })
          .where(eq(sync_h_c_p_access_logs.id, syncId));
        return { sync_id: syncId, events_count: 0 };
      }

      // hik_central_devices: internal id → device hik_central_device_id (string).
      const devRows = await this.db
        .select({
          id: hik_central_devices.id,
          hik_central_device_id: hik_central_devices.hik_central_device_id,
        })
        .from(hik_central_devices)
        .where(inArray(hik_central_devices.id, internalDeviceIds));
      const doors = devRows.map((d) => String(d.hik_central_device_id));

      // Log offline HCP devices for access_levels.devices in h_c_p_devices (status=false).
      const alDevicesRows = await this.db
        .select({ devices: hik_central_access_levels.devices })
        .from(hik_central_access_levels)
        .where(inArray(hik_central_access_levels.id, accessLevelIds));
      const flatDeviceIds = new Set<number>();
      for (const row of alDevicesRows) {
        if (row.devices) {
          const parsed = parseDevicesJson(row.devices);
          for (const d of parsed) flatDeviceIds.add(d);
        }
      }
      if (flatDeviceIds.size > 0) {
        const offline = await this.db
          .select({
            device_id: h_c_p_devices.device_id,
            name: h_c_p_devices.name,
          })
          .from(h_c_p_devices)
          .where(
            and(
              inArray(h_c_p_devices.device_id, [...flatDeviceIds]),
              eq(h_c_p_devices.status, false),
            ),
          );
        if (offline.length) {
          await this.db.insert(sync_offline_devices).values(
            offline.map((o) => ({
              sync_h_c_p_access_log_id: syncId,
              hik_central_device_id: Number(o.device_id),
              name: o.name,
            })),
          );
        }
      }

      // HCP doorEvents — paged ingest.
      const startIso = `${body.from_date}T00:00:00+05:00`;
      const endIso = `${body.to_date}T23:59:59+05:00`;
      const perPage = 500;

      // Devices map: hik_central_device_id (string) → {id, area_name, status}
      const devMap = new Map<
        string,
        { internal_id: number; area_name: string | null; status: boolean }
      >();
      const devDetailRows = await this.db.execute(sql`
        SELECT id, hik_central_device_id, area_name, status
        FROM hik_central_devices
        WHERE id IN (${sql.join(
          internalDeviceIds.map((n) => sql`${n}`),
          sql`, `,
        )})
      `);
      const ddRows = (devDetailRows as any).rows ?? devDetailRows;
      for (const d of ddRows as any[]) {
        devMap.set(String(d.hik_central_device_id), {
          internal_id: Number(d.id),
          area_name: d.area_name,
          status: Boolean(d.status),
        });
      }
      // access_level_id by internal device id
      const alByDev = new Map<number, number>();
      for (const ald of aldRows) {
        // Get the access_level_id from a separate query
      }
      const aldFull = await this.db
        .select({
          dev_id: hik_central_access_level_devices.hik_central_device_id,
          al_id: hik_central_access_level_devices.hik_central_access_level_id,
        })
        .from(hik_central_access_level_devices)
        .where(
          inArray(
            hik_central_access_level_devices.hik_central_access_level_id,
            accessLevelIds,
          ),
        );
      for (const r of aldFull) {
        alByDev.set(Number(r.dev_id), Number(r.al_id));
      }

      // Fetch first page to determine total
      let eventsCount = 0;
      const firstRes = await this.hcp.doorEvents(
        startIso,
        endIso,
        doors,
        perPage,
        1,
      );
      if (!firstRes.status) {
        await this.db
          .update(sync_h_c_p_access_logs)
          .set({
            status: 2,
            error: (firstRes.msg ?? 'doorEvents failed').slice(0, 255),
            updated_at: sql`NOW()`,
          })
          .where(eq(sync_h_c_p_access_logs.id, syncId));
        return { sync_id: syncId, events_count: 0, error: firstRes.msg };
      }
      const total = firstRes.total ?? 0;
      const lastPage = Math.ceil(total / perPage);
      const firstInserted = await this.ingestPage(
        firstRes.list ?? [],
        devMap,
        alByDev,
      );
      eventsCount += firstInserted;

      for (let page = 2; page <= lastPage; page++) {
        const res = await this.hcp.doorEvents(
          startIso,
          endIso,
          doors,
          perPage,
          page,
        );
        if (!res.status) continue;
        eventsCount += await this.ingestPage(res.list ?? [], devMap, alByDev);
      }

      await this.db
        .update(sync_h_c_p_access_logs)
        .set({
          status: 3,
          events_count: eventsCount,
          updated_at: sql`NOW()`,
        })
        .where(eq(sync_h_c_p_access_logs.id, syncId));

      return { sync_id: syncId, events_count: eventsCount };
    } catch (err) {
      const msg = (err as Error).message ?? 'sync failed';
      await this.db
        .update(sync_h_c_p_access_logs)
        .set({ status: 2, error: msg.slice(0, 255), updated_at: sql`NOW()` })
        .where(eq(sync_h_c_p_access_logs.id, syncId));
      throw err;
    }
  }

  // HCP doorEvents page items → batch insert into terminal_events.
  // Match worker by card OR pin (Laravel: where card IN or pin IN).
  private async ingestPage(
    list: Array<{
      doorIndexCode: string;
      doorName: string;
      eventTime: string;
      cardNo?: string;
      temperatureStatus?: number;
      wearMaskStatus?: number;
    }>,
    devMap: Map<
      string,
      { internal_id: number; area_name: string | null; status: boolean }
    >,
    alByDev: Map<number, number>,
  ): Promise<number> {
    if (!list.length) return 0;
    const cardNos = new Set<number>();
    for (const item of list) {
      if (item.cardNo && item.cardNo.length === 7) {
        const n = Number(item.cardNo);
        if (Number.isFinite(n)) cardNos.add(n);
      }
    }
    if (!cardNos.size) return 0;

    const workerRows = await this.db.execute(sql`
      SELECT w.id, w.card, w.pin, w.last_name, w.first_name, w.middle_name,
             (SELECT MAX(wp.id) FROM worker_positions wp
              WHERE wp.worker_id = w.id AND wp.status = 2 AND wp.deleted_at IS NULL
             ) AS position_id
      FROM workers w
      WHERE w.card IN (${sql.join(
        [...cardNos].map((n) => sql`${n}`),
        sql`, `,
      )})
         OR w.pin  IN (${sql.join(
           [...cardNos].map((n) => sql`${n}`),
           sql`, `,
         )})
    `);
    const wRows = ((workerRows as any).rows ?? workerRows) as Array<{
      id: number | string;
      card: number | null;
      pin: number | string | null;
      last_name: string | null;
      first_name: string | null;
      middle_name: string | null;
      position_id: number | null;
    }>;
    const byCard = new Map<number, (typeof wRows)[number]>();
    for (const w of wRows) {
      if (w.card != null) byCard.set(Number(w.card), w);
      if (w.pin != null) byCard.set(Number(w.pin), w);
    }

    const rowsToInsert: Array<Record<string, unknown>> = [];
    const created = new Date().toISOString().replace('T', ' ').slice(0, 19);
    for (const item of list) {
      if (!item.cardNo) continue;
      const card = Number(item.cardNo);
      if (!Number.isFinite(card)) continue;
      const device = devMap.get(String(item.doorIndexCode));
      if (!device) continue;
      const w = byCard.get(card);
      if (!w) continue;
      rowsToInsert.push({
        worker_id: Number(w.id),
        hik_central_access_level_id: alByDev.get(device.internal_id) ?? null,
        worker_position_id: w.position_id ?? null,
        event_date_and_time: item.eventTime,
        auth_type: 'ACSEventFaceVerifyPass',
        device_name: device.area_name,
        resource_name: item.doorName,
        last_name: w.last_name,
        first_name: w.first_name,
        middle_name: w.middle_name,
        direction: device.status,
        temperature: item.temperatureStatus ?? null,
        mask_status: item.wearMaskStatus ?? null,
        created_at: created,
        updated_at: created,
      });
    }
    if (!rowsToInsert.length) return 0;

    // Batch insertOrIgnore into parent partitioned terminal_events.
    const columns = Object.keys(rowsToInsert[0]);
    const valuesSql = sql.join(
      rowsToInsert.map(
        (row) =>
          sql`(${sql.join(
            columns.map((c) => sql`${row[c] as never}`),
            sql`, `,
          )})`,
      ),
      sql`, `,
    );
    const result = await this.db.execute(sql`
      INSERT INTO terminal_events (${sql.raw(columns.join(', '))})
      VALUES ${valuesSql}
      ON CONFLICT DO NOTHING
    `);
    return Number((result as any).rowCount ?? 0);
  }
}

// hik_central_access_levels.devices — varchar JSON.
function parseDevicesJson(raw: unknown): number[] {
  if (raw == null) return [];
  let v: unknown = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  return v.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

// Laravel TurnStileHelper::calcWorkDuration parity.
// Events sorted by time, then "fold" same-direction consecutives (PHP `reduce()` with
// pop on same direction). Then sum IN→OUT minute pairs. If still inside (last IN
// without OUT) and date is today — add minutes till now; else till endOfDay.
function calcWorkDurationMinutes(
  events: Array<{ event_date_and_time: string; direction: boolean }>,
  dateStr: string,
): number {
  if (!events.length) return 0;
  const today = dateStr === new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = today ? new Date() : new Date(`${dateStr}T23:59:59`);

  // Sort by time + fold same-direction.
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.event_date_and_time).getTime() -
      new Date(b.event_date_and_time).getTime(),
  );
  const folded: typeof sorted = [];
  for (const e of sorted) {
    if (folded.length && folded[folded.length - 1].direction === e.direction) {
      folded.pop();
    }
    folded.push(e);
  }

  let totalMin = 0;
  let inside = false;
  let lastIn: Date = dayStart;
  for (const e of folded) {
    const t = new Date(e.event_date_and_time);
    if (!e.direction) {
      // Chiqish
      totalMin += Math.abs(diffMinutes(t, lastIn));
      inside = false;
    } else {
      // Kirish
      inside = true;
      lastIn = t;
    }
  }
  if (inside) {
    totalMin += Math.abs(diffMinutes(dayEnd, lastIn));
  }
  return Math.round(totalMin);
}

function diffMinutes(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / 60000;
}

// Daily attendance helpers.
function enumerateDays(from: string, to: string): string[] {
  const out: string[] = [];
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  for (let d = f; d <= t; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function addDayStr(d: string): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}
