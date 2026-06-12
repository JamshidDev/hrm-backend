// Integration worker salary service. Laravel: WorkerController.getStatements,
// WorkerController.getStatementMonths. permission: integration-worker-salary.

import { Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { organizations, statements, workers } from '@/db/schema';
import { buildStatementDetail } from '@/modules/integration/worker-salary/statement-details.util';
import type {
  WorkerSalaryDto,
  WorkerSalaryMonthsDto,
} from '@/modules/integration/worker-salary/dto/worker-salary.dto';

@Injectable()
export class IntegrationWorkerSalaryService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  /**
   * POST /integration/worker/salary — Laravel getStatements.
   * Worker uuid → Statement WHERE pin=worker.pin AND year AND month → buildDetails.
   */
  async getStatements(dto: WorkerSalaryDto) {
    const [worker] = await this.db
      .select({ pin: workers.pin })
      .from(workers)
      .where(and(eq(workers.uuid, dto.uuid), notDeleted(workers)))
      .limit(1);
    if (!worker) return [];

    const rows = await this.db
      .select({
        stmt: statements,
        org_full: organizations.full_name,
        org_name: organizations.name,
      })
      .from(statements)
      .leftJoin(organizations, eq(organizations.id, statements.organization_id))
      .where(
        and(
          worker.pin != null ? eq(statements.pin, worker.pin) : undefined,
          eq(statements.year, dto.year),
          eq(statements.month, dto.month),
        ),
      );

    const lang = this.ctx.lang;
    const salary = rows.map((r) =>
      buildStatementDetail(r.stmt, r.org_full, r.org_name, lang),
    );
    return { salary };
  }

  /**
   * POST /integration/worker/get-salary-months — Laravel getStatementMonths.
   * Worker uuid → Statement WHERE worker_id=id OR pin=pin, distinct (year, month).
   */
  async getStatementMonths(dto: WorkerSalaryMonthsDto) {
    const [worker] = await this.db
      .select({ id: workers.id, pin: workers.pin })
      .from(workers)
      .where(and(eq(workers.uuid, dto.uuid), notDeleted(workers)))
      .limit(1);
    if (!worker) return [];

    const months = await this.db
      .select({ year: statements.year, month: statements.month })
      .from(statements)
      .where(
        or(
          eq(statements.worker_id, worker.id),
          worker.pin != null ? eq(statements.pin, worker.pin) : undefined,
        ),
      )
      .groupBy(statements.year, statements.month);

    return { months };
  }
}
