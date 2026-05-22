// Export service. Laravel: ExportTaskController + ReportExportController.
//
// Hozirgi qamrov (4 endpoint):
//   - GET    /export/tasks-count    — count unread tasks (user'ga tegishli)
//   - POST   /export/tasks-read     — mark as read (single yoki all)
//   - GET    /report-export          — ReportExport list
//   - POST   /report-export          — fonda Excel hisobot eksporti (ExportTaskRunner)

import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  user_export_tasks,
  report_exports,
  model_has_roles,
  roles,
} from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { ReportExportDto } from '@/modules/structure/export/dto/report-export.dto';
import { buildReportExportExcel } from '@/modules/structure/export/report-export.builder';

// ExportTaskEnum keys — `messages.export.types.{key}`.
// Bizning enums.constants.ts'da yo'q, alohida ro'yxat (Laravel cases bilan mos).
const EXPORT_TASK_TYPE_KEYS: Record<number, string> = {
  1: 'workers',
  2: 'late_come',
  3: 'zip',
  4: 'exam_results',
  5: 'exam_not_passed_workers',
  6: 'turnstile_absent_workers',
  7: 'turnstile_late_workers',
  8: 'turnstile_early_leave_workers',
  9: 'turnstile_work_durations',
  10: 'pensioners',
  11: 'relatives',
  12: 'statement_with_codes_by_organizations',
  13: 'statement_with_codes_by_workers',
  14: 'statement_multiple_workers',
  15: 'statement_with_codes',
  16: 'statement_with_organizations',
  17: 'devices',
  18: 'online_devices',
  19: 'offline_devices',
  20: 'last_sync_devices',
  21: 'current_in_workers',
  22: 'current_out_workers',
  23: 'daily_attendance',
  24: 'turnstile_come',
  25: 'turnstile_not_come',
  26: 'vacation_workers',
  27: 'statements_by_positions',
  28: 'incentive',
  29: 'disciplinary',
  30: 'report_export_by_education',
  31: 'notIncludedScheduleWorkers',
  32: 'turnstile_schedule_timesheet',
  33: 'statement_with_codes_by_year',
};

@Injectable()
export class ExportService {
  // Laravel `asset($path)` — APP_URL/{path} prefix. Test parity uchun.
  private readonly assetBaseUrl: string;

  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly config: ConfigService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
  ) {
    this.assetBaseUrl = (
      this.config.get<string>('LARAVEL_APP_URL') ?? 'http://localhost:8000'
    ).replace(/\/+$/, '');
  }

  // GET /export/tasks-count — unread tasks count.
  // Laravel: hasRole('Admin') → barcha tasks; aks holda — faqat o'ziniki.
  async getUnreadCount(): Promise<{ count: number }> {
    const userId = this.ctx.user_or_fail.id;
    const isAdmin = await this.userHasAdminRole(userId);

    const where = isAdmin
      ? isNull(user_export_tasks.read_at)
      : and(
          isNull(user_export_tasks.read_at),
          eq(user_export_tasks.user_id, userId),
        );

    const [row] = await this.db
      .select({ c: count() })
      .from(user_export_tasks)
      .where(where);
    return { count: Number(row?.c ?? 0) };
  }

  // Spatie permission — model_has_roles + roles.name='Admin'.
  private async userHasAdminRole(userId: number): Promise<boolean> {
    const [row] = await this.db
      .select({ id: roles.id })
      .from(model_has_roles)
      .innerJoin(roles, eq(model_has_roles.role_id, roles.id))
      .where(
        and(
          eq(model_has_roles.model_type, 'App\\Models\\User'),
          eq(model_has_roles.model_id, userId),
          eq(roles.name, 'Admin'),
        ),
      )
      .limit(1);
    return !!row;
  }

  // POST /export/tasks-read — mark as read.
  // body: {all: bool} yoki {ids: number[]}.
  async markAsRead(body: { all?: boolean; ids?: number[] }): Promise<void> {
    const userId = this.ctx.user_or_fail.id;

    if (body.all) {
      await this.db
        .update(user_export_tasks)
        .set({ read_at: sql`NOW()` })
        .where(
          and(
            eq(user_export_tasks.user_id, userId),
            isNull(user_export_tasks.read_at),
          ),
        );
    } else if (body.ids && body.ids.length > 0) {
      await this.db
        .update(user_export_tasks)
        .set({ read_at: sql`NOW()` })
        .where(
          and(
            eq(user_export_tasks.user_id, userId),
            inArray(user_export_tasks.id, body.ids),
            isNull(user_export_tasks.read_at),
          ),
        );
    }
  }

  // GET /report-export — list of available export types.
  async getReportExportList(): Promise<
    {
      id: number;
      type: string;
      name: string;
      description: string | null;
      photo: string;
      is_active: boolean;
    }[]
  > {
    const rows = await this.db.select().from(report_exports);
    // Laravel asset($photo) — `{APP_URL}/{path}` shaklida full URL.
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      description: r.description,
      photo: r.photo ? `${this.assetBaseUrl}/${r.photo}` : '',
      is_active: r.is_active,
    }));
  }

  // POST /report-export — Laravel: ReportExportController::export().
  // `type` ga qarab fonda Excel hisobot eksport vazifasini boshlaydi.
  async reportExport(dto: ReportExportDto): Promise<void> {
    // Laravel `match($type)` — faqat 'by-education-age-invalid' qo'llab-quvvatlanadi.
    if (dto.type !== 'by-education-age-invalid') {
      throw new BusinessException(422, this.i18n.t('messages.invalid_type'));
    }

    const user = this.ctx.user_or_fail;
    await this.exportRunner.run({
      type: 30, // ExportTaskEnum.REPORT_EXPORT_BY_EDUCATION
      folder: 'report-export',
      build: () =>
        buildReportExportExcel(this.db, this.excel, {
          userOrgId: user.organization_id,
          organizations: dto.organizations,
          type: dto.type,
        }),
    });
  }

  // EXPORT_TASK_TYPE_KEYS — kelajakda UserTaskResource uchun ishlatamiz.
  // Hozircha silencer.
  private _silencer(): void {
    void EXPORT_TASK_TYPE_KEYS;
  }
}
