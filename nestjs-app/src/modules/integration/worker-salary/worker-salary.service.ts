// Integration worker salary service. Laravel: WorkerController.getStatements,
// WorkerController.getStatementMonths. permission: integration-worker-salary.

import { Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { organizations, statements, workers } from '@/db/schema';
import { STATEMENT_CODE_NAMES } from '@/modules/integration/worker-salary/statement-codes';
import type {
  WorkerSalaryDto,
  WorkerSalaryMonthsDto,
} from '@/modules/integration/worker-salary/dto/worker-salary.dto';

// Laravel number_format($n, 2, ',', ' ') — 2 kasr, ',' kasr ajratgich, ' ' minglik.
function numberFormat(n: number): string {
  const neg = n < 0;
  const rounded = Math.round(Math.abs(n) * 100 + 1e-9) / 100;
  const fixed = rounded.toFixed(2);
  const [intPart, dec] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + grouped + ',' + dec;
}

export interface ExtractItem {
  code: string;
  type: string;
  amount: string;
}

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
      this.buildDetail(r.stmt, r.org_full, r.org_name, lang),
    );
    return { salary };
  }

  // Laravel StatementDetailService::buildDetails (bitta statement uchun).
  private buildDetail(
    stmt: Record<string, unknown>,
    orgFull: string | null,
    orgName: string | null,
    lang: string,
  ) {
    const inBlock = this.extractData(stmt, 1, 600, lang);
    const outBlock = this.extractData(stmt, 856, 999, lang);
    return {
      worker: {
        full_name: stmt.full_name as string | null,
        pin: stmt.pin as number | null,
        position: stmt.position as string | null,
        main_salary: stmt.main_salary as number,
        work_time: stmt.work_time as number,
        year: stmt.year as number,
        month: stmt.month as number,
        organization: `${orgFull ?? ''} (${orgName ?? ''})`,
      },
      in: inBlock.items,
      in_total: inBlock.total,
      out: outBlock.items,
      out_total: outBlock.total,
      in_card: {
        code: this.codeLabel('885', lang),
        amount: stmt.s_885 as number,
      },
    };
  }

  // Laravel StatementService::extractData — s_NNN (from..to) non-zero kolonkalar.
  private extractData(
    stmt: Record<string, unknown>,
    from: number,
    to: number,
    lang: string,
  ): { items: ExtractItem[]; total: string } {
    const items: ExtractItem[] = [];
    let sum = 0;
    for (let i = from; i <= to; i++) {
      const code = String(i).padStart(3, '0');
      const value = stmt[`s_${code}`];
      // Laravel: isset && !== 0.0 → null/undefined yoki 0 o'tkazib yuboriladi.
      if (typeof value === 'number' && value !== 0) {
        sum += value;
        items.push({
          code,
          type: this.codeLabel(code, lang),
          amount: numberFormat(value),
        });
      }
    }
    return { items, total: numberFormat(sum) };
  }

  private codeLabel(code: string, lang: string): string {
    const dict = STATEMENT_CODE_NAMES[lang] ?? STATEMENT_CODE_NAMES.uz;
    return dict[code] ?? code;
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
