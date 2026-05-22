// Integration meds service. Laravel: MedController.index + IntegrationController.meds.

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { meds } from '@/db/schema';
import {
  pageOf,
  type IntegrationPageQueryDto,
} from '@/modules/integration/_shared/page-query.dto';

@Injectable()
export class IntegrationMedService {
  constructor(@InjectDb() private readonly db: DataSource) {}

  /** GET /integration/meds — paginatsiya. */
  async list(q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(meds);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(meds)
        .where(where)
        .orderBy(desc(meds.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(meds).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  /** GET /integration/workers/:id/meds — bitta workerning medlari. */
  async byWorker(workerId: number, q: IntegrationPageQueryDto) {
    const { page, perPage, offset } = pageOf(q);
    const where = and(eq(meds.worker_id, workerId), notDeleted(meds));
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(meds)
        .where(where)
        .orderBy(desc(meds.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(meds).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }
}
