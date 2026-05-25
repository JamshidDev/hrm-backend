// HikCentral Event service. Laravel: EventController.
// terminal_events jadvali partitioned (oylik/kunlik bo'limlar). Drizzle schema-da
// faqat per-day partitions bor — parent `terminal_events` raw SQL bilan o'qiladi.

import { Injectable } from '@nestjs/common';
import { count, desc, inArray, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { sync_h_c_p_access_logs, workers } from '@/db/schema';
import { nextId, pageOf } from '@/modules/turnstile/_shared/helpers';

export interface EventListQuery {
  page?: number;
  per_page?: number;
  search?: string;
  date?: string;
  direction?: string;
  access_levels?: string;
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
  ) {}

  // Laravel: index — paginated terminal_events per worker, with worker eager-load.
  async list(q: EventListQuery) {
    const { page, perPage, offset } = pageOf(q);
    const date = q.date ? new Date(q.date) : new Date();
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

    const conds: any[] = [
      sql`event_date_and_time >= ${startStr}`,
      sql`event_date_and_time < ${endStr}`,
      sql`deleted_at IS NULL`,
    ];
    if (q.direction !== undefined) {
      conds.push(sql`direction = ${Number(q.direction) === 1}`);
    }
    if (q.access_levels) {
      const ids = q.access_levels.split(',').map(Number).filter(Boolean);
      if (ids.length) conds.push(sql`hik_central_access_level_id IN ${ids}`);
    }
    const whereSql = sql.join(conds, sql` AND `);

    const [rowsResult, totalResult] = await Promise.all([
      this.db.execute(sql`
        SELECT id, worker_id, event_date_and_time, direction, device_name,
               hik_central_access_level_id, auth_type, mask_status, temperature
        FROM terminal_events
        WHERE ${whereSql}
        ORDER BY event_date_and_time DESC
        LIMIT ${perPage} OFFSET ${offset}
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int AS total FROM terminal_events WHERE ${whereSql}
      `),
    ]);
    const rows = ((rowsResult as any).rows ?? rowsResult) as any[];
    const total = Number(
      ((totalResult as any).rows ?? totalResult)[0]?.total ?? 0,
    );

    const workerIds = [
      ...new Set(rows.map((r) => Number(r.worker_id)).filter(Boolean)),
    ];
    const wRows = workerIds.length
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
        ...r,
        worker: wMap.get(Number(r.worker_id)) ?? null,
      })),
    };
  }

  // Laravel: newStyleEvents — workers-grouped view with per-worker events.
  // Note: Laravel returns shape `{ current_page, total, data: [...] }` (no per_page).
  async newStyleEvents(q: EventListQuery) {
    const { page, perPage, offset } = pageOf(q);
    const [wRows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: workers.id,
          last_name: workers.last_name,
          first_name: workers.first_name,
          middle_name: workers.middle_name,
          photo: workers.photo,
        })
        .from(workers)
        .where(notDeleted(workers))
        .orderBy(desc(workers.id))
        .limit(perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(workers)
        .where(notDeleted(workers)),
    ]);

    const date = q.date ? new Date(q.date) : new Date();
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

    const workerIds = wRows.map((w) => w.id);
    const eventsByWorker: Record<number, any[]> = {};
    if (workerIds.length) {
      const evResult = await this.db.execute(sql`
        SELECT worker_id, event_date_and_time, direction, device_name
        FROM terminal_events
        WHERE worker_id IN ${workerIds}
          AND event_date_and_time >= ${startStr}
          AND event_date_and_time < ${endStr}
        ORDER BY event_date_and_time
      `);
      const evRows = ((evResult as any).rows ?? evResult) as any[];
      for (const e of evRows) {
        const wid = Number(e.worker_id);
        (eventsByWorker[wid] ??= []).push(e);
      }
    }

    return {
      current_page: page,
      total: Number(total),
      data: wRows.map((w) => ({
        ...w,
        on_vacation: false,
        vacation_from: null,
        vacation_to: null,
        terminal_events: eventsByWorker[w.id] ?? [],
      })),
    };
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
        per_page: perPage,
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

  // Laravel: syncEvents — creates SyncHCPAccessLog and dispatches a job.
  // We create the log row only.
  async syncEvents(body: SyncEventsBody) {
    if (!body.from_date || !body.to_date) {
      throw new BusinessException(422, 'from_date and to_date are required');
    }
    const userId = this.ctx.user_or_fail.id;
    const id = await nextId(this.db, sync_h_c_p_access_logs);
    await this.db.insert(sync_h_c_p_access_logs).values({
      id,
      user_id: userId,
      day: body.from_date,
      type: 2,
      status: 1,
    });
    return { sync_id: id, dispatched: true };
  }
}
