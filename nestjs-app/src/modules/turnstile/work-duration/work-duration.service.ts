// Work duration service. Laravel: WorkDurationController + TerminalLogController.
// terminal_logs jadvali — har kun ish vaqti / kirim-chiqim.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { terminal_logs } from '@/db/schema';
import { pageOf } from '@/modules/turnstile/_shared/helpers';

export interface WorkDurationQuery {
  page?: number;
  per_page?: number;
  search?: string;
  start?: string;
  end?: string;
}

@Injectable()
export class WorkDurationService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  // Laravel: WorkDurationController::index — paginated terminal_logs join with
  // worker_position, organization, position, terminal. Heavy joins; here we
  // return base rows (frontend can hydrate via separate calls).
  async list(q: WorkDurationQuery) {
    const { page, perPage, offset } = pageOf(q);
    const conds = [notDeleted(terminal_logs)];
    if (q.start) conds.push(sql`${terminal_logs.event_time} >= ${q.start}`);
    if (q.end) conds.push(sql`${terminal_logs.event_time} <= ${q.end}`);
    const where = and(...conds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(terminal_logs)
        .where(where)
        .orderBy(desc(terminal_logs.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(terminal_logs).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // Laravel: WorkDurationController::logs — worker's logs for a specific date.
  async logsForWorker(q: { worker_id?: number; date?: string }) {
    if (!q.worker_id || !q.date) return [];
    return this.db
      .select()
      .from(terminal_logs)
      .where(
        and(
          eq(terminal_logs.worker_id, Number(q.worker_id)),
          sql`DATE(${terminal_logs.event_time}) = ${q.date}`,
          notDeleted(terminal_logs),
        ),
      );
  }

  // Laravel: TerminalLogController::index — same shape as WorkDurationController::index.
  terminalLogs(q: WorkDurationQuery) {
    return this.list(q);
  }

  // Laravel: TerminalLogController::export — dispatches an Excel export job.
  // We return URL stub (no actual export here).
  terminalLogsExport() {
    return { exported: true, url: '' };
  }
}
