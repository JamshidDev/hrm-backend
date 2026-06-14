// Confirmation Dashboard. Laravel: Confirmation/DashboardController.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { count, and, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  command_confirmations,
  contract_additional_confirmations,
  contract_confirmations,
  timesheet_confirmations,
  vacation_schedule_confirmations,
  worker_application_confirmations,
  worker_applications,
} from '@/db/schema';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { CONFIRMATION_STATUS_LABELS } from '@/modules/hr/worker-applications/worker-application.types';

@Injectable()
class ConfirmationDashboardService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  // Laravel DashboardController::workerApplicationStatistics:
  //   WorkerApplication::get()->groupBy('confirmation')->map(count); so'ng
  //   ConfirmationStatusEnum::cases() bo'yicha [{id, name(trans), applications}].
  //   FILTERSIZ (user_id YO'Q), worker_applications jadvali, `confirmation` ustuni.
  async workerApplicationStatistics() {
    const rows = await this.db
      .select({
        confirmation: worker_applications.confirmation,
        cnt: count(),
      })
      .from(worker_applications)
      .where(notDeleted(worker_applications))
      .groupBy(worker_applications.confirmation);

    const byConfirmation: Record<number, number> = {};
    for (const r of rows) {
      if (r.confirmation != null) byConfirmation[r.confirmation] = Number(r.cnt);
    }

    const lang = this.ctx.lang;
    return [1, 2, 3, 4, 5].map((id) => ({
      id,
      name: this.i18n.t(CONFIRMATION_STATUS_LABELS[id], { lang }),
      applications: byConfirmation[id] ?? 0,
    }));
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
  @RawResponse()
  @ApiOperation({ summary: 'Worker application statistics (by status)' })
  // Laravel bare massiv qaytaradi (Helper::response O'RAMAYDI) — @RawResponse.
  async statistics() {
    return this.service.workerApplicationStatistics();
  }
}

export { ConfirmationDashboardService };
