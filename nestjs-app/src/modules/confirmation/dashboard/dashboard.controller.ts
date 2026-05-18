// Confirmation Dashboard. Laravel: Confirmation/DashboardController.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { count, eq, and, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  command_confirmations,
  contract_additional_confirmations,
  contract_confirmations,
  timesheet_confirmations,
  vacation_schedule_confirmations,
  worker_application_confirmations,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';

@Injectable()
class ConfirmationDashboardService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  async workerApplicationStatistics() {
    const userId = this.ctx.user_or_fail.id;
    // Worker application confirmations assigned to current user by status.
    const rows = await this.db
      .select({
        status: worker_application_confirmations.status,
        cnt: count(),
      })
      .from(worker_application_confirmations)
      .where(
        and(
          eq(worker_application_confirmations.worker_id, userId),
          notDeleted(worker_application_confirmations),
        ),
      )
      .groupBy(worker_application_confirmations.status);

    const byStatus: Record<number, number> = {};
    for (const r of rows) byStatus[r.status] = Number(r.cnt);
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

    return {
      total,
      process: byStatus[1] ?? 0,
      read: byStatus[2] ?? 0,
      success: byStatus[3] ?? 0,
      rejected: byStatus[4] ?? 0,
      deleted: byStatus[5] ?? 0,
    };
  }

  async confirmationStats() {
    // General confirmation counts by status for sidebar badges.
    const stats: Record<string, { total: number; pending: number }> = {};
    const tables: Array<[string, unknown]> = [
      ['contracts', contract_confirmations],
      ['commands', command_confirmations],
      ['contract_additional', contract_additional_confirmations],
      ['timesheet', timesheet_confirmations],
      ['vacation_schedule', vacation_schedule_confirmations],
      ['applications', worker_application_confirmations],
    ];
    for (const [name, t] of tables) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = t as any;
      const [{ total }] = await this.db
        .select({ total: count() })
        .from(tbl)
        .where(notDeleted(tbl));
      const [{ pending }] = await this.db
        .select({ pending: count() })
        .from(tbl)
        .where(and(notDeleted(tbl), sql`${tbl.status} = 1`));
      stats[name] = { total: Number(total), pending: Number(pending) };
    }
    return stats;
  }
}

@ApiTags('Confirmation / Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/worker-application')
export class ConfirmationDashboardController {
  constructor(private readonly service: ConfirmationDashboardService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Worker application statistics (by status)' })
  async statistics() {
    return buildSuccess(true, await this.service.workerApplicationStatistics());
  }
}

export { ConfirmationDashboardService };
