// Integration workers service. Laravel: IntegrationController.workers, WorkerController.workers,
// IntegrationController.workerByPin, showWorker, showWorkerTurnstileEventsByMonth/ByDay.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { workers } from '@/db/schema';
import {
  pageOf,
  type IntegrationPageQueryDto,
} from '@/modules/integration/_shared/page-query.dto';
import type {
  WorkerByPinQueryDto,
  WorkersByPinsDto,
} from '@/modules/integration/workers/dto/worker.dto';

interface DayEvent {
  event_date_and_time: string;
  direction: boolean;
}

@Injectable()
export class IntegrationWorkerService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
  ) {}

  /** GET /integration/workers — paginatsiya + search. */
  async list(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const conds = [notDeleted(workers)];
    if (q.search) {
      const pattern = `%${q.search}%`;
      conds.push(
        sql`(${workers.last_name} ILIKE ${pattern} OR ${workers.first_name} ILIKE ${pattern} OR ${workers.middle_name} ILIKE ${pattern})`,
      );
    }
    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(workers)
        .where(where)
        .orderBy(desc(workers.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(workers).where(where),
    ]);

    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** POST /integration/workers/by-pins — pin'lar ro'yxati bo'yicha workerlar. */
  async byPins(dto: WorkersByPinsDto) {
    if (!dto.pins.length) return [];
    return this.db
      .select()
      .from(workers)
      .where(and(inArray(workers.pin, dto.pins), notDeleted(workers)));
  }

  /** GET /integration/worker-by-pin?pin=<n>. */
  async byPin(q: WorkerByPinQueryDto) {
    const [row] = await this.db
      .select()
      .from(workers)
      .where(and(eq(workers.pin, q.pin), notDeleted(workers)))
      .limit(1);
    return row ?? null;
  }

  /** GET /integration/worker/show/:workerUuid — Laravel findOrFail → 404. */
  async showByUuid(workerUuid: string) {
    const [row] = await this.db
      .select()
      .from(workers)
      .where(eq(workers.uuid, workerUuid))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    return row;
  }

  // Laravel: Worker::whereUuid($uuid)->value('id') yo'q bo'lsa not_found (404).
  private async resolveWorkerId(uuid: string): Promise<number> {
    const [w] = await this.db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.uuid, uuid), notDeleted(workers)))
      .limit(1);
    if (!w) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return w.id;
  }

  /**
   * GET /integration/worker/turnstile-events-month/:workerUuid — Laravel
   * EventController::showWorkerDurations. Oydagi terminal_events'lar kun bo'yicha
   * guruhlanib, har kun uchun ishlangan daqiqalar (calcWorkDuration).
   */
  async turnstileEventsByMonth(
    workerUuid: string,
    year: number,
    month: number,
  ) {
    const workerId = await this.resolveWorkerId(workerUuid);
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const start = `${year}-${mm}-01 00:00:00`;
    const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')} 23:59:59.999999`;

    // terminal_events — partitsiyalangan parent (drizzle schema'da yo'q) → raw SQL.
    const res = await this.db.execute(sql`
      SELECT event_date_and_time::text AS event_date_and_time, direction
      FROM terminal_events
      WHERE worker_id = ${workerId}
        AND event_date_and_time BETWEEN ${start} AND ${end}
      ORDER BY event_date_and_time
    `);
    const events = rowsOf(res) as unknown as DayEvent[];

    // groupBy(Y-m-d) — saralangani uchun kunlar xronologik tartibda.
    const byDay = new Map<string, DayEvent[]>();
    for (const e of events) {
      const day = e.event_date_and_time.slice(0, 10);
      const arr = byDay.get(day);
      if (arr) arr.push(e);
      else byDay.set(day, [e]);
    }

    const result: {
      worker_id: number;
      event_date: string;
      daily_minutes: number;
    }[] = [];
    for (const [day, dayEvents] of byDay) {
      result.push({
        worker_id: workerId,
        event_date: day,
        daily_minutes: this.calcWorkDuration(dayEvents, day),
      });
    }
    return result;
  }

  // Laravel TurnStileHelper::calcWorkDuration — kunlik ishlangan daqiqalar.
  private calcWorkDuration(events: DayEvent[], cDate: string): number {
    const todayStr = new Date().toISOString().slice(0, 10); // now()->toDateString() (UTC)
    const isToday = cDate === todayStr;
    const ms = (s: string) => Date.parse(`${s.replace(' ', 'T')}Z`);
    const startOfDay = ms(`${cDate} 00:00:00`);
    const endOfDay = isToday ? Date.now() : ms(`${cDate} 23:59:59.999`);

    // Ketma-ket bir xil direction → oxirgisini saqlash (Laravel reduce).
    const sorted = [...events].sort(
      (a, b) => ms(a.event_date_and_time) - ms(b.event_date_and_time),
    );
    const deduped: DayEvent[] = [];
    for (const e of sorted) {
      if (
        deduped.length &&
        deduped[deduped.length - 1].direction === e.direction
      ) {
        deduped.pop();
      }
      deduped.push(e);
    }

    let totalMin = 0;
    let lastEventTime = startOfDay;
    let inFlag = false;
    for (const e of deduped) {
      if (!e.direction) {
        // Chiqish
        totalMin += Math.abs(ms(e.event_date_and_time) - lastEventTime) / 60000;
        inFlag = false;
      }
      if (e.direction) {
        // Kirish
        inFlag = true;
        lastEventTime = ms(e.event_date_and_time);
      }
    }
    if (inFlag) {
      totalMin += Math.abs(endOfDay - lastEventTime) / 60000;
    }
    return Math.round(totalMin);
  }

  /**
   * GET /integration/worker/turnstile-events-day/:workerUuid — Laravel
   * EventController::showWorkerEventsInDay. Kun bo'yicha terminal_events'lar.
   */
  async turnstileEventsByDay(workerUuid: string, date: string) {
    const workerId = await this.resolveWorkerId(workerUuid);
    const res = await this.db.execute(sql`
      SELECT id, event_date_and_time::text AS event_date_and_time,
             device_name AS device, direction, mask_status, temperature
      FROM terminal_events
      WHERE worker_id = ${workerId}
        AND DATE(event_date_and_time) = ${date}
      ORDER BY event_date_and_time
    `);
    return rowsOf(res).map((r) => ({
      id: Number(r.id),
      event_date_and_time: r.event_date_and_time as string,
      device: r.device as string | null,
      direction: r.direction as boolean,
      mask_status: r.mask_status as number,
      temperature: r.temperature as number,
    }));
  }
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  const r = result as { rows?: unknown[] };
  return (Array.isArray(r.rows) ? r.rows : result) as Record<string, unknown>[];
}
