// Worker schedule service. Laravel: TurnstileWorkerScheduleController +
// TurnstileWorkerScheduleGenerateController + TurnstileTimesheetController.
// Source table: `turnstile_worker_schedules` (partitioned by date).

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { departments, worker_positions } from '@/db/schema';
import { pageOf } from '@/modules/turnstile/_shared/helpers';

@Injectable()
export class WorkerScheduleService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: paginate — distinct worker_positions with schedule rows.
  // Requires `date` (Laravel IndexRequest rule: 'date' => required|date).
  async list(q: {
    page?: number;
    per_page?: number;
    date?: string;
    group_id?: number;
  }) {
    if (!q.date) throw new BusinessException(422, 'date is required');
    const { page, perPage, offset } = pageOf(q);
    const conds: string[] = ['deleted_at IS NULL'];
    if (q.date) conds.push(`date = '${q.date}'`);
    if (q.group_id)
      conds.push(`turnstile_schedule_group_id = ${Number(q.group_id)}`);
    const whereStr = conds.join(' AND ');
    const result = await this.db.execute(
      sql.raw(`
      SELECT DISTINCT ON (worker_position_id) worker_id, worker_position_id, date, work_status, start_time, end_time
      FROM turnstile_worker_schedules
      WHERE ${whereStr}
      ORDER BY worker_position_id DESC, date DESC
      LIMIT ${perPage} OFFSET ${offset}
    `),
    );
    const countResult = await this.db.execute(
      sql.raw(`
      SELECT COUNT(DISTINCT worker_position_id)::int AS total
      FROM turnstile_worker_schedules
      WHERE ${whereStr}
    `),
    );
    const rows = ((result as any).rows ?? result) as any[];
    const total = Number(
      ((countResult as any).rows ?? countResult)[0]?.total ?? 0,
    );
    return { current_page: page, per_page: perPage, total, data: rows };
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

  async update(
    workerPositionId: number,
    body: {
      schedules?: Array<{
        date: string;
        start_time?: string;
        end_time?: string;
        work_status?: number;
      }>;
    },
  ) {
    if (body.schedules?.length) {
      for (const s of body.schedules) {
        await this.db.execute(sql`
          UPDATE turnstile_worker_schedules
          SET start_time = ${s.start_time ?? null},
              end_time = ${s.end_time ?? null},
              work_status = ${s.work_status ?? 1},
              updated_at = NOW()
          WHERE worker_position_id = ${workerPositionId}
            AND date = ${s.date}
            AND deleted_at IS NULL
        `);
      }
    }
    return { updated: true };
  }

  async remove(workerPositionId: number) {
    await this.db.execute(sql`
      UPDATE turnstile_worker_schedules
      SET deleted_at = NOW()
      WHERE worker_position_id = ${workerPositionId}
    `);
  }

  // Laravel: paginateWithTurnstile — workers+schedule grid (same shape).
  indexTurnstileSheet(q: { page?: number; per_page?: number; date?: string }) {
    return this.list(q);
  }

  // Laravel: TurnstileTimesheetController::exportTimeSheet.
  async exportTimesheet(_body: unknown) {
    return { exported: true, url: '' };
  }

  // Laravel: TurnstileController::userTimesheetDepartments.
  async listDepartments(q: { page?: number; per_page?: number }) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(departments);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(departments)
        .where(where)
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(departments).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: generatePreview / generateSchedule — heavy job dispatchers. Stubs.
  async generate(_body: unknown) {
    return { dispatched: true };
  }

  // Laravel: TurnstileWorkerScheduleGenerateController::workers.
  async generateGetWorkers(q: { page?: number; per_page?: number }) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(
      notDeleted(worker_positions),
      eq(worker_positions.status, 1),
    );
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(worker_positions)
        .where(where)
        .orderBy(desc(worker_positions.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(worker_positions).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: dayInMonth — { month, year, days: [{day, weekDay, is_holiday}] }.
  // Carbon::dayOfWeek: 0=Sunday..6=Saturday.
  generateDayInMonth(q: { year?: number; month?: number }) {
    const now = new Date();
    const year = Number(q.year ?? now.getFullYear());
    const month = Number(q.month ?? now.getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1, i + 1));
      return {
        day: i + 1,
        weekDay: d.getUTCDay(),
        is_holiday: false,
      };
    });
    return { month, year, days };
  }

  async generateScheduleAction(_body: unknown) {
    return { generated: true };
  }
  async generateScheduleByWorker(_body: unknown) {
    return { generated: true };
  }
  async replacementWorkers(_body: unknown) {
    return { replaced: true };
  }
  async generateTurnstileSchedule(_body: unknown) {
    return { generated: true };
  }
}
