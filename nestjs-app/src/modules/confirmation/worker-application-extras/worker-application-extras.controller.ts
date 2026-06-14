// Worker-application extras controller.
// Laravel: HR/WorkerApplicationController endpoints under /v1/worker-application.

import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { RequestContext } from '@/common/context/request.context';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import {
  confirmation_workers,
  worker_application_confirmations,
  worker_applications,
  worker_positions,
  workers,
} from '@/db/schema';
import { MinioService } from '@/shared/minio/minio.service';
import { ConvertService } from '@/shared/convert/convert.service';
import { WorkerApplicationReplaceService } from '@/modules/hr/worker-applications/worker-application-replace.service';
import { randomUUID } from 'crypto';

// ---- DTOs ----

class WorkerAppQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() organizations?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  director_id?: number;
}

export class WorkerAppStoreDto {
  @ApiProperty() @Type(() => Number) @IsInt() type!: number;
  @ApiProperty() @Type(() => Number) @IsInt() director_id!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  worker_position_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;

  // --- Ariza DOCX'i uchun tur-specific maydonlar (Laravel dto[...]) ---
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_position_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() from_date?: string;
  @ApiPropertyOptional() @IsOptional() rate?: number | string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contract_to_date?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  temporarily_absent?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period_from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() univer_date?: string;
  @ApiPropertyOptional() @IsOptional() univer_number?: number | string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  education_type?: number;
}

// ---- Application Education Type Enum (Confirmation/Enums) ----
const APPLICATION_EDUCATION_TYPES = [
  { id: 1, name: 'messages.education.types.one' }, // Oliy
  { id: 2, name: 'messages.education.types.two' }, // O'rta maxsus
  { id: 3, name: 'messages.education.types.three' }, // Maktab
];

const WORKER_APPLICATION_TYPE_LABELS: Record<number, string> = {
  1: 'messages.application.types.one',
  2: 'messages.application.types.two',
  3: 'messages.application.types.three',
  4: 'messages.application.types.four',
  5: 'messages.application.types.five',
  6: 'messages.application.types.six',
  7: 'messages.application.types.seven',
  8: 'messages.application.types.eight',
  9: 'messages.application.types.nine',
  10: 'messages.application.types.ten',
};

@Injectable()
class WorkerApplicationExtrasService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
    private readonly i18n: I18nService,
    private readonly minio: MinioService,
    private readonly replace: WorkerApplicationReplaceService,
    private readonly convert: ConvertService,
  ) {}

  // GET /api/v1/worker-application/enums
  enums() {
    const lang = this.ctx.lang;
    const tr = (key: string) => {
      const v = this.i18n.t(key, { lang });
      return typeof v === 'string' ? v : '';
    };
    return {
      application_types: Object.entries(WORKER_APPLICATION_TYPE_LABELS).map(
        ([id, key]) => ({ id: Number(id), name: tr(key) }),
      ),
      education_types: APPLICATION_EDUCATION_TYPES.map((t) => ({
        id: t.id,
        name: tr(t.name),
      })),
    };
  }

  // GET /api/v1/worker-application/directors?organization_id=
  async directors(filters: WorkerAppQueryDto) {
    const orgId =
      filters.organization_id ??
      (filters.organizations
        ? Number(filters.organizations.split(',')[0])
        : null) ??
      this.ctx.user_or_fail.organization_id;
    if (!orgId) return [];

    const rows = await this.db
      .select({
        id: confirmation_workers.id,
        position: confirmation_workers.position,
        worker_id: workers.id,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_photo: workers.photo,
      })
      .from(confirmation_workers)
      .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
      .where(
        and(
          eq(confirmation_workers.organization_id, orgId),
          eq(confirmation_workers.level, 1), // Director
          notDeleted(confirmation_workers),
        ),
      );

    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        position: r.position,
        worker: r.worker_id
          ? {
              id: r.worker_id,
              last_name: r.worker_last,
              first_name: r.worker_first,
              middle_name: r.worker_middle,
              photo: await this.minio.fileUrl(r.worker_photo),
            }
          : null,
      })),
    );
  }

  // GET /api/v1/worker-application/confirmations?director_id=
  async confirmations(filters: WorkerAppQueryDto) {
    const perPage = filters.per_page ?? 50;
    if (!filters.director_id) return { data: [] };

    const rows = await this.db
      .select({
        id: confirmation_workers.id,
        position: confirmation_workers.position,
        worker_id: workers.id,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_photo: workers.photo,
      })
      .from(confirmation_workers)
      .leftJoin(workers, eq(workers.id, confirmation_workers.worker_id))
      .where(
        and(
          ne(confirmation_workers.id, filters.director_id),
          notDeleted(confirmation_workers),
        ),
      )
      .orderBy(asc(confirmation_workers.id))
      .limit(perPage);

    return {
      current_page: 1,
      per_page: perPage,
      total: rows.length,
      data: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          position: r.position,
          worker: r.worker_id
            ? {
                id: r.worker_id,
                last_name: r.worker_last,
                first_name: r.worker_first,
                middle_name: r.worker_middle,
                photo: await this.minio.fileUrl(r.worker_photo),
              }
            : null,
        })),
      ),
    };
  }

  // GET /api/v1/worker-application/positions
  async myPositions() {
    const workerId = this.ctx.user_or_fail.worker_id;
    if (!workerId) return [];
    return this.db
      .select({
        id: worker_positions.id,
        organization_id: worker_positions.organization_id,
        position_id: worker_positions.position_id,
      })
      .from(worker_positions)
      // Laravel WorkerApplicationService::myPositions — whereStatus(ACTIVE=2).
      .where(
        and(
          eq(worker_positions.worker_id, workerId),
          eq(worker_positions.status, 2),
          notDeleted(worker_positions),
        ),
      );
  }

  // GET /api/v1/worker-application/temporarily-workers
  async temporarilyWorkers(filters: WorkerAppQueryDto) {
    const perPage = filters.per_page ?? 50;
    // Workers with `external` or `temporary_worker_id` set — simplified.
    const rows = await this.db
      .select({
        id: workers.id,
        uuid: workers.uuid,
        last_name: workers.last_name,
        first_name: workers.first_name,
        middle_name: workers.middle_name,
        photo: workers.photo,
      })
      .from(workers)
      .where(and(notDeleted(workers), isNull(workers.external)))
      .limit(perPage);

    return Promise.all(
      rows.map(async (w) => ({
        ...w,
        photo: await this.minio.fileUrl(w.photo),
      })),
    );
  }

  // POST /api/v1/worker-application/applications
  async store(dto: WorkerAppStoreDto): Promise<void> {
    const userId = this.ctx.user_or_fail.id;
    const workerId = this.ctx.user_or_fail.worker_id;
    const uuid = randomUUID();
    const docxKey = `worker-application/${uuid}.docx`;
    const pdfKey = `documents/worker-application/${uuid}.pdf`;

    // DOCX'ni OLDIN tayyorlaymiz (Laravel generateFile → workerApplicationReplace).
    const { buffer, director } = await this.replace.buildDocx(dto, workerId);

    // Laravel: organization_id = director->organization_id.
    const orgId =
      director.organizationId || this.ctx.user_or_fail.organization_id;
    if (!orgId) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }

    await this.db.transaction(async (tx) => {
      const [app] = await tx
        .insert(worker_applications)
        .values({
          uuid,
          organization_id: orgId,
          worker_id: workerId,
          worker_position_id: dto.worker_position_id ?? null,
          user_id: userId,
          director_id: dto.director_id,
          number: Math.floor(Math.random() * 100000),
          year: new Date().getFullYear(),
          application_date: new Date().toISOString().split('T')[0],
          type: dto.type,
          generate: 3,
          file: docxKey,
          confirmation_file: pdfKey,
        })
        .returning({ id: worker_applications.id });

      // Confirmations — Laravel storeConfirmations: hodim 'w' + direktor 'd'.
      const confRows: Array<{
        worker_application_id: number;
        type: string;
        worker_id: number | null;
        position: string | null;
      }> = [
        {
          worker_application_id: app.id,
          type: 'w',
          worker_id: workerId,
          position: null,
        },
      ];
      if (director.directorWorkerId) {
        confRows.push({
          worker_application_id: app.id,
          type: 'd',
          worker_id: director.directorWorkerId,
          position: director.directorPosition,
        });
      }
      await tx.insert(worker_application_confirmations).values(confRows);
    });

    await this.minio.putObject(
      docxKey,
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    void this.generatePdf(buffer, pdfKey);
  }

  // DOCX→PDF konvertatsiya + MinIO yuklash (fon).
  private async generatePdf(buffer: Buffer, pdfKey: string): Promise<void> {
    try {
      const pdf = await this.convert.docxToPdf(buffer);
      await this.minio.putObject(pdfKey, pdf, 'application/pdf');
    } catch {
      // PDF muvaffaqiyatsiz — DOCX baribir saqlangan.
    }
  }

  // GET /api/v1/worker-application/applications/{id}/edit
  async edit(id: number) {
    const [row] = await this.db
      .select()
      .from(worker_applications)
      .where(
        and(eq(worker_applications.id, id), notDeleted(worker_applications)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    return row;
  }

  // PUT /api/v1/worker-application/applications/{id}/update
  async update(id: number, dto: WorkerAppStoreDto): Promise<void> {
    const [row] = await this.db
      .select({ id: worker_applications.id })
      .from(worker_applications)
      .where(
        and(eq(worker_applications.id, id), notDeleted(worker_applications)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(worker_applications)
      .set({
        type: dto.type,
        director_id: dto.director_id,
        worker_position_id: dto.worker_position_id ?? null,
        updated_at: sql`NOW()`,
      })
      .where(eq(worker_applications.id, id));
  }

  // DELETE /api/v1/worker-application/applications/{id}
  async remove(id: number): Promise<void> {
    const [row] = await this.db
      .select({ id: worker_applications.id })
      .from(worker_applications)
      .where(
        and(eq(worker_applications.id, id), notDeleted(worker_applications)),
      )
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    await this.db
      .update(worker_applications)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(worker_applications.id, id));
  }

  // POST /api/v1/document/application-confirmation — public signed URL handler.
  async applicationConfirmation(_dto: Record<string, unknown>) {
    // E-IMZO callback — stub.
    return { confirmed: true };
  }
}

@ApiTags('Confirmation / Worker Application')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/worker-application')
export class WorkerApplicationExtrasController {
  constructor(
    private readonly service: WorkerApplicationExtrasService,
    private readonly i18n: I18nService,
  ) {}

  @Get('enums')
  enums() {
    return buildSuccess(true, this.service.enums());
  }

  @Get('directors')
  async directors(@Query() query: WorkerAppQueryDto) {
    return buildSuccess(true, await this.service.directors(query));
  }

  @Get('confirmations')
  async confirmations(@Query() query: WorkerAppQueryDto) {
    return buildSuccess(true, await this.service.confirmations(query));
  }

  @Get('positions')
  async positions() {
    return buildSuccess(true, await this.service.myPositions());
  }

  @Get('temporarily-workers')
  async temporarilyWorkers(@Query() query: WorkerAppQueryDto) {
    return buildSuccess(true, await this.service.temporarilyWorkers(query));
  }

  @Post('applications')
  async store(@Body() dto: WorkerAppStoreDto) {
    await this.service.store(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Get('applications/:id/edit')
  async edit(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.edit(id));
  }

  @Put('applications/:id/update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkerAppStoreDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('applications/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

export { WorkerApplicationExtrasService };
