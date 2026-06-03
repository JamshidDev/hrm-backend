// ExportTask service. Laravel: ExportTaskController::index().
// Admin: barcha tasks. Non-admin: faqat o'ziniki.

import { Injectable } from '@nestjs/common';
import { and, desc, eq, count, isNull } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  user_export_tasks,
  users as usersTable,
  workers,
  model_has_roles,
  roles,
} from '@/db/schema';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { toLaravelDateTime } from '@/common/utils/datetime.util';
import {
  ExportTaskListResponseDto,
  QueryExportTaskDto,
} from '@/modules/hr/export-tasks/dto/export-task.dto';

// ExportTaskEnum 1..33 → `messages.export.types.{key}`.
const EXPORT_TASK_TYPE_KEYS: Record<number, string> = {
  1: 'messages.export.types.workers',
  2: 'messages.export.types.late_come',
  3: 'messages.export.types.zip',
  4: 'messages.export.types.exam_results',
  5: 'messages.export.types.exam_not_passed_workers',
  6: 'messages.export.types.turnstile_absent_workers',
  7: 'messages.export.types.turnstile_late_workers',
  8: 'messages.export.types.turnstile_early_leave_workers',
  9: 'messages.export.types.turnstile_work_durations',
  10: 'messages.export.types.pensioners',
  11: 'messages.export.types.relatives',
  12: 'messages.export.types.statement_with_codes_by_organizations',
  13: 'messages.export.types.statement_with_codes_by_workers',
  14: 'messages.export.types.statement_multiple_workers',
  15: 'messages.export.types.statement_with_codes',
  16: 'messages.export.types.statement_with_organizations',
  17: 'messages.export.types.devices',
  18: 'messages.export.types.online_devices',
  19: 'messages.export.types.offline_devices',
  20: 'messages.export.types.last_sync_devices',
  21: 'messages.export.types.current_in_workers',
  22: 'messages.export.types.current_out_workers',
  23: 'messages.export.types.daily_attendance',
  24: 'messages.export.types.turnstile_come',
  25: 'messages.export.types.turnstile_not_come',
  26: 'messages.export.types.vacation_workers',
  27: 'messages.export.types.statements_by_positions',
  28: 'messages.export.types.incentive',
  29: 'messages.export.types.disciplinary',
  30: 'messages.export.types.report_export_by_education',
  31: 'messages.export.types.notIncludedScheduleWorkers',
  32: 'messages.export.types.turnstile_schedule_timesheet',
  33: 'messages.export.types.statement_with_codes_by_year',
};

const JOB_STATUS_KEYS: Record<number, string> = {
  1: 'messages.job.statuses.process',
  2: 'messages.job.statuses.done',
  3: 'messages.job.statuses.error',
};

@Injectable()
export class ExportTaskService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
  ) {}

  async findAll(
    filters: QueryExportTaskDto,
  ): Promise<ExportTaskListResponseDto> {
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const lang = this.ctx.lang;
    const userId = this.ctx.user?.id ?? 0;
    const isAdmin = await this.userHasAdminRole(userId);

    const where = and(
      isNull(user_export_tasks.deleted_at),
      isAdmin ? undefined : eq(user_export_tasks.user_id, userId),
    );

    const offset = (page - 1) * perPage;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: user_export_tasks.id,
          type: user_export_tasks.type,
          status: user_export_tasks.status,
          file: user_export_tasks.file,
          read_at: user_export_tasks.read_at,
          created_at: user_export_tasks.created_at,
          updated_at: user_export_tasks.updated_at,
          worker_id: workers.id,
          worker_photo: workers.photo,
          worker_last: workers.last_name,
          worker_first: workers.first_name,
          worker_middle: workers.middle_name,
        })
        .from(user_export_tasks)
        .leftJoin(usersTable, eq(usersTable.id, user_export_tasks.user_id))
        .leftJoin(workers, eq(workers.id, usersTable.worker_id))
        .where(where)
        .orderBy(desc(user_export_tasks.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(user_export_tasks).where(where),
    ]);

    return {
      current_page: page,
      total: Number(total),
      data: await Promise.all(
        rows.map(async (r) => {
          const typeKey = EXPORT_TASK_TYPE_KEYS[r.type];
          const typeLabel = typeKey ? this.i18n.t(typeKey, { lang }) : '';
          const statusKey = JOB_STATUS_KEYS[r.status];
          const statusLabel = statusKey ? this.i18n.t(statusKey, { lang }) : '';
          return {
            id: r.id,
            type: typeof typeLabel === 'string' ? typeLabel : '',
            status: {
              id: r.status,
              name: typeof statusLabel === 'string' ? statusLabel : '',
            },
            worker: r.worker_id
              ? {
                  id: r.worker_id,
                  photo: await this.minio.fileUrl(r.worker_photo),
                  last_name: r.worker_last,
                  first_name: r.worker_first,
                  middle_name: r.worker_middle,
                }
              : null,
            file: await this.minio.fileUrl(r.file),
            read_at: r.read_at,
            created_at: toLaravelDateTime(r.created_at),
            updated_at: toLaravelDateTime(r.updated_at),
          };
        }),
      ),
    };
  }

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
}
