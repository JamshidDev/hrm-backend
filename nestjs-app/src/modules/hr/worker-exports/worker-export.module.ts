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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ResumeService } from '@/modules/hr/worker-exports/resume.service';
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
import { user_export_tasks, worker_positions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { resolveOrgScopeIds } from '@/common/database/org-scope.helper';
import { PermissionService } from '@/shared/permission/permission.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ExportTaskRunner } from '@/shared/export-task/export-task-runner.service';
import { WORKER_EXPORT_COLUMNS } from '@/modules/hr/worker-exports/worker-export.constants';
import {
  buildRelativesExcel,
  RELATIVE_KEYS,
} from '@/modules/hr/worker-exports/relatives-export.builder';
import { buildResumesZip } from '@/modules/hr/worker-exports/resumes-zip.builder';
import { buildWorkersExcel } from '@/modules/hr/worker-exports/workers-export.builder';
import { MinioService } from '@/shared/minio/minio.service';
import { createHash } from 'crypto';

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
    private readonly perms: PermissionService,
    private readonly excel: ExcelService,
    private readonly exportRunner: ExportTaskRunner,
    private readonly minio: MinioService,
    private readonly resume: ResumeService,
  ) {}

  columns() {
    const lang = this.ctx.lang;
    const langKey = lang === 'ru' || lang === 'en' ? lang : 'uz';
    return (WORKER_EXPORT_COLUMNS as Record<string, unknown>)[langKey];
  }

  // POST /api/v1/hr/export/workers — Laravel: WorkersExportToExcelJob.
  // `columns` array foydalanuvchi tanlangan ustunlar; har xil enum
  // (sex/marital/education/type/med_status) NestJS i18n orqali tarjima.
  async exportWorkers(
    columns: string[],
    query: { organizations?: string; organization_id?: number },
  ) {
    const user = this.ctx.user_or_fail;
    const lang = this.ctx.lang;
    const orgScopeIds = await resolveOrgScopeIds(
      this.db,
      this.perms,
      user.id,
      user.organization_id,
    );

    // i18n yordamida har bir ustun uchun label.
    const langKey = lang === 'ru' || lang === 'en' ? lang : 'uz';
    const colMap = WORKER_EXPORT_COLUMNS as Record<
      string,
      Array<{ column: string; label: string }>
    >;
    const headerByCol = new Map<string, string>();
    for (const c of colMap[langKey] ?? []) headerByCol.set(c.column, c.label);
    const columnHeaders: Record<string, string> = {};
    for (const col of columns) {
      columnHeaders[col] = headerByCol.get(col) ?? col;
    }

    // ContractTypeMinimized — 1..6 → label.
    const CONTRACT_KEYS: Record<number, string> = {
      1: 'minimeze_employment_contract_indefinite',
      2: 'minimeze_employment_contract_part_time',
      3: 'minimeze_civil_labor_contract',
      4: 'minimeze_employment_contract_remote',
      5: 'minimeze_employment_contract_seasonal',
      6: 'minimeze_employment_contract_fixed',
    };
    const contractTypeMinimized: Record<number, string> = {};
    for (const [k, suffix] of Object.entries(CONTRACT_KEYS)) {
      const tr = this.i18n.t(`messages.contract.${suffix}`, { lang });
      contractTypeMinimized[Number(k)] =
        typeof tr === 'string' && !tr.startsWith('messages.') ? tr : '';
    }
    // EducationEnum — 1=Oliy, 2=O'rta maxsus, 3=O'rta.
    const EDU_KEYS: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three' };
    const educationLabels: Record<number, string> = {};
    for (const [k, suffix] of Object.entries(EDU_KEYS)) {
      const tr = this.i18n.t(`messages.education.level.${suffix}`, { lang });
      educationLabels[Number(k)] =
        typeof tr === 'string' && !tr.startsWith('messages.') ? tr : '';
    }
    // MedStatusEnum — 1=Sog'lom, 2=Nosog'lom.
    const MED_KEYS: Record<number, string> = { 1: 'one', 2: 'two' };
    const medStatusLabels: Record<number, string> = {};
    for (const [k, suffix] of Object.entries(MED_KEYS)) {
      const tr = this.i18n.t(`messages.worker.med.${suffix}`, { lang });
      medStatusLabels[Number(k)] =
        typeof tr === 'string' && !tr.startsWith('messages.') ? tr : '';
    }

    await this.exportRunner.run({
      type: EXPORT_TASK_WORKERS,
      // Laravel: `tasks/export/{md5(task->id)}.xlsx` — folder/sub-folder yo'q.
      folder: '',
      keyBuilder: (taskId) =>
        `tasks/export/${createHash('md5').update(String(taskId)).digest('hex')}.xlsx`,
      build: () =>
        buildWorkersExcel(this.db, this.excel, {
          columns,
          orgScopeIds,
          organizations: query.organizations,
          organizationId: query.organization_id,
          contractTypeMinimized,
          educationLabels,
          medStatusLabels,
          columnHeaders,
        }),
    });
  }

  // POST /api/v1/hr/export/relatives — Laravel: WorkerRelativesExportJob.
  // Excel'ni fonda yaratadi va MinIO'ga yuklaydi (`tasks/export/relatives/...xlsx`).
  async exportRelatives(filters?: {
    organizations?: string;
    organization_id?: number;
  }) {
    const user = this.ctx.user_or_fail;
    const lang = this.ctx.lang;
    const orgScopeIds = await resolveOrgScopeIds(
      this.db,
      this.perms,
      user.id,
      user.organization_id,
    );

    // Laravel DynamicExportFromArray('worker') — `messages.worker.{col}` topilmasa
    // raw kalit. Pin/full_name/relative/last_name etc. uchun i18n yo'q → raw.
    const COLS = [
      'full_name',
      'pin',
      'relative',
      'last_name',
      'first_name',
      'middle_name',
      'birthday',
      'birth_place',
      'post_name',
      'address',
    ] as const;
    const headings = COLS.map((col) => {
      const key = `messages.worker.${col}`;
      const v = this.i18n.t(key);
      return typeof v === 'string' && v !== key ? v : col;
    });

    // Qarindoshlik turi label'lari (uz/ru/en) — Laravel `RelativeEnum::get($val,'uz')`
    // explicit 'uz' uzatadi. Bizda current lang.
    const relativeLabels: Record<number, string> = {};
    for (const [k, suffix] of Object.entries(RELATIVE_KEYS)) {
      const tr = this.i18n.t(`messages.worker.family.${suffix}`, { lang });
      relativeLabels[Number(k)] =
        typeof tr === 'string' && !tr.startsWith('messages.') ? tr : '';
    }

    await this.exportRunner.run({
      type: EXPORT_TASK_RELATIVES,
      folder: 'relatives',
      build: () =>
        buildRelativesExcel(
          this.db,
          this.excel,
          {
            orgScopeIds,
            organizations: filters?.organizations,
            organizationId: filters?.organization_id,
            relativeLabels,
          },
          headings,
        ),
    });
  }

  // POST /api/v1/hr/export/resumes — Laravel: WorkersResumesZipJob.
  // Bir nechta xodimning resume.docx fayllarini ZIP arxivga to'plab MinIO'ga
  // yuklaydi. passport=true bo'lsa, pasport fayllarini ham qo'shadi.
  async exportResumes(query: {
    organizations?: string;
    organization_id?: number;
    worker_ids?: number[];
    passport?: boolean;
    all?: boolean;
  }) {
    const user = this.ctx.user_or_fail;
    const orgScopeIds = await resolveOrgScopeIds(
      this.db,
      this.perms,
      user.id,
      user.organization_id,
    );

    // Laravel: 'tasks/zip/' . ($user->id . time()) . '.zip' — Laravel'ga mos path.
    const zipName = `${user.id}${Date.now()}`;
    await this.exportRunner.run({
      type: EXPORT_TASK_WORKERS_RESUMES,
      folder: 'zip',
      ext: 'zip',
      contentType: 'application/zip',
      keyBuilder: () => `tasks/zip/${zipName}.zip`,
      build: () =>
        buildResumesZip(this.db, this.minio, this.resume, {
          orgScopeIds,
          organizations: query.organizations,
          organizationId: query.organization_id,
          workerIds: query.worker_ids,
          passport: !!query.passport,
        }),
    });
  }

  // GET /api/v1/hr/worker-positions/{uuid}/resume-download — stub.
  async downloadResume(uuid: string) {
    const [wp] = await this.db
      .select({
        id: worker_positions.id,
        worker_id: worker_positions.worker_id,
      })
      .from(worker_positions)
      .where(and(eq(worker_positions.uuid, uuid), notDeleted(worker_positions)))
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
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker export columns (i18n labels)' })
  columns() {
    return buildSuccess(true, this.service.columns());
  }

  @Post('workers')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Queue workers export (selected columns → Excel)' })
  async exportWorkers(
    @Body()
    body: {
      columns?: string[];
      query?: { organizations?: string | null; organization_id?: number };
    } = {},
  ) {
    const columns = Array.isArray(body.columns) ? body.columns : [];
    const q = body.query ?? {};
    await this.service.exportWorkers(columns, {
      organizations: q.organizations ?? undefined,
      organization_id: q.organization_id,
    });
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Post('relatives')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Queue relatives export task (Excel → MinIO)' })
  async exportRelatives(
    @Body() body: { organizations?: string; organization_id?: number } = {},
  ) {
    await this.service.exportRelatives(body);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Post('resumes')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Queue resumes ZIP export (DOCX + optional passports)',
  })
  async exportResumes(
    @Body()
    body: {
      query?: {
        organizations?: string | null;
        organization_id?: number;
        worker_ids?: number[];
        passport?: boolean;
        all?: boolean;
      };
    } = {},
  ) {
    const q = body.query ?? {};
    await this.service.exportResumes({
      organizations: q.organizations ?? undefined,
      organization_id: q.organization_id,
      worker_ids: q.worker_ids,
      passport: q.passport,
      all: q.all,
    });
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }
}

@ApiTags('HR / Worker Exports')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-positions')
class ResumeDownloadController {
  constructor(private readonly resume: ResumeService) {}

  // Laravel: ResumeController::downloadResume — BinaryFileResponse (.docx).
  @Get(':uuid/resume-download')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Generate + download resume DOCX' })
  async downloadResume(
    @Param('uuid') uuid: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.resume.generate(uuid);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [WorkerExportController, ResumeDownloadController],
  providers: [WorkerExportService, ResumeService],
})
export class WorkerExportModule {}
