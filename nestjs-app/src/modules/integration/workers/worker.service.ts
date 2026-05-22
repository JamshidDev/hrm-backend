// Integration workers service. Laravel: IntegrationController.workers, WorkerController.workers,
// IntegrationController.workerByPin, showWorker, showWorkerTurnstileEventsByMonth/ByDay.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
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

@Injectable()
export class IntegrationWorkerService {
  constructor(@InjectDb() private readonly db: DataSource) {}

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

  /** GET /integration/worker/turnstile-events-month/:workerUuid — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async turnstileEventsByMonth(
    _workerUuid: string,
    _q: IntegrationPageQueryDto,
  ) {
    return [];
  }

  /** GET /integration/worker/turnstile-events-day/:workerUuid — stub. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async turnstileEventsByDay(_workerUuid: string, _q: IntegrationPageQueryDto) {
    return [];
  }
}
