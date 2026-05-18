// WorkerExport module — Laravel: WorkerExportController + ResumeController.
//
// Endpoints:
//   - GET /api/v1/hr/export/workers/columns
//   - POST /api/v1/hr/export/workers (queue job)
//   - POST /api/v1/hr/export/resumes (queue job)
//   - POST /api/v1/hr/export/relatives (queue job)
//   - GET /api/v1/hr/worker-positions/{uuid}/resume-download

import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { RequestContext } from '@/common/context/request.context';
import { BusinessException } from '@/common/exceptions/business.exception';
import { AuthModule } from '@/modules/auth/auth.module';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { user_export_tasks, workers, worker_positions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { WORKER_EXPORT_COLUMNS } from '@/modules/hr/worker-exports/worker-export.constants';

// ExportTaskEnum: 1=WORKERS, 2=RELATIVES, 3=WORKERS_RESUMES.
const EXPORT_TASK_WORKERS = 1;
const EXPORT_TASK_RELATIVES = 2;
const EXPORT_TASK_WORKERS_RESUMES = 3;

@Injectable()
class WorkerExportService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
  ) {}

  columns() {
    const lang = this.ctx.lang;
    const langKey = lang === 'ru' || lang === 'en' ? lang : 'uz';
    return (WORKER_EXPORT_COLUMNS as Record<string, unknown>)[langKey];
  }

  // POST /api/v1/hr/export/workers — Laravel: dispatches WorkersExportToExcelJob.
  async exportWorkers() {
    const userId = this.ctx.user_or_fail.id;
    const [task] = await this.db
      .insert(user_export_tasks)
      .values({
        user_id: userId,
        type: EXPORT_TASK_WORKERS,
      })
      .returning({ id: user_export_tasks.id });
    // Background job processing — skipped (no queue infrastructure).
    return { task_id: task.id };
  }

  // POST /api/v1/hr/export/relatives
  async exportRelatives() {
    const userId = this.ctx.user_or_fail.id;
    const [task] = await this.db
      .insert(user_export_tasks)
      .values({
        user_id: userId,
        type: EXPORT_TASK_RELATIVES,
      })
      .returning({ id: user_export_tasks.id });
    return { task_id: task.id };
  }

  // POST /api/v1/hr/export/resumes — Laravel: dispatches WorkersResumesZipJob.
  async exportResumes() {
    const userId = this.ctx.user_or_fail.id;
    const [task] = await this.db
      .insert(user_export_tasks)
      .values({
        user_id: userId,
        type: EXPORT_TASK_WORKERS_RESUMES,
      })
      .returning({ id: user_export_tasks.id });
    return { task_id: task.id };
  }

  // GET /api/v1/hr/worker-positions/{uuid}/resume-download — stub.
  async downloadResume(uuid: string) {
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(
        and(eq(worker_positions.uuid, uuid), notDeleted(worker_positions)),
      )
      .limit(1);
    if (!wp || !wp.worker_id) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // Laravel: builds DocX in-memory, returns BinaryFileResponse.
    // Stub: return placeholder URL for now.
    return {
      worker_position_id: wp.id,
      worker_id: wp.worker_id,
      file: 'stub-resume-not-generated.docx',
    };
  }
}

@ApiTags('HR / Worker Exports')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/export')
class WorkerExportController {
  constructor(
    private readonly service: WorkerExportService,
    private readonly i18n: I18nService,
  ) {}

  @Get('workers/columns')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker export columns (i18n labels)' })
  columns() {
    return buildSuccess(true, this.service.columns());
  }

  @Post('workers')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Queue workers export task' })
  async exportWorkers(@Body() _body: Record<string, unknown>) {
    return buildSuccess(
      this.i18n.t('messages.successfully_exported'),
      await this.service.exportWorkers(),
    );
  }

  @Post('relatives')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Queue relatives export task' })
  async exportRelatives() {
    return buildSuccess(
      this.i18n.t('messages.successfully_exported'),
      await this.service.exportRelatives(),
    );
  }

  @Post('resumes')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Queue resumes ZIP export task' })
  async exportResumes() {
    return buildSuccess(
      this.i18n.t('messages.export.success'),
      await this.service.exportResumes(),
    );
  }
}

@ApiTags('HR / Worker Exports')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-positions')
class ResumeDownloadController {
  constructor(private readonly service: WorkerExportService) {}

  @Get(':uuid/resume-download')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Generate + download resume (stub)' })
  async downloadResume(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.downloadResume(uuid));
  }
}

@Module({
  imports: [AuthModule],
  controllers: [WorkerExportController, ResumeDownloadController],
  providers: [WorkerExportService],
})
export class WorkerExportModule {}
