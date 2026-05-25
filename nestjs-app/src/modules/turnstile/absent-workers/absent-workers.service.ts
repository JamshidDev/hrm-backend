// Turnstile absent-scheduled-workers export service.
// Laravel: TurnstileController::absentScheduledWorkers + TurnstileAbsentWorkersInRangeExcelJob.
//
// Fonda Excel hisobot tayyorlaydi (ExportTaskRunner — user_export_tasks lifecycle).

import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { RequestContext } from '@/common/context/request.context';
import { resolveOrgScopeIds } from '@/common/database/org-scope.helper';
import { ExcelService } from '@/shared/excel/excel.service';
import { PermissionService } from '@/shared/permission/permission.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { AbsentWorkersQueryDto } from '@/modules/turnstile/absent-workers/dto/absent-workers.dto';
import { buildAbsentWorkersExcel } from '@/modules/turnstile/absent-workers/absent-workers.builder';

// DynamicExportFromArray ustunlari — i18n kaliti `messages.worker.{col}`.
const EXPORT_COLUMNS = [
  'organization_name',
  'full_name',
  'position_name',
  'absent_count',
  'absent_days',
] as const;

@Injectable()
export class AbsentWorkersService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly excel: ExcelService,
    private readonly perms: PermissionService,
    private readonly exportRunner: ExportTaskRunner,
  ) {}

  // GET /absent-scheduled-workers — fonda Excel eksport vazifasini boshlaydi.
  async exportAbsentWorkers(dto: AbsentWorkersQueryDto): Promise<void> {
    // Laravel: to_date after_or_equal:from_date.
    if (dto.to_date < dto.from_date) {
      throw new BusinessException(
        422,
        "to_date sanasi from_date dan oldin bo'lmasligi kerak",
      );
    }

    const user = this.ctx.user_or_fail;
    // Laravel WorkerPosition::filter → QueryHelper::childIds (ruxsat etilgan orglar).
    const orgScopeIds = await resolveOrgScopeIds(
      this.db,
      this.perms,
      user.id,
      user.organization_id,
    );

    // DynamicExportFromArray sarlavhalari — messages.worker.{col}, topilmasa xom kalit.
    const headings = EXPORT_COLUMNS.map((col) => {
      const key = `messages.worker.${col}`;
      const v = this.i18n.t(key);
      return typeof v === 'string' && v !== key ? v : col;
    });

    await this.exportRunner.run({
      type: 6, // ExportTaskEnum.TURNSTILE_ABSENT_WORKERS
      folder: 'turnstile',
      build: () =>
        buildAbsentWorkersExcel(
          this.db,
          this.excel,
          {
            fromDate: dto.from_date,
            toDate: dto.to_date,
            orgScopeIds,
            organizations: dto.organizations,
            organizationId: dto.organization_id,
          },
          headings,
        ),
    });
  }
}
