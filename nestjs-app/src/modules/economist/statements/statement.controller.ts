// Statement controller. Laravel: Economist/StatementController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { StatementService } from '@/modules/economist/statements/statement.service';
import {
  StatementListQueryDto,
  CreateStatementDto,
  UpdateStatementDto,
  StatementDecodingQueryDto,
  StatementDecodingByOrgQueryDto,
  MultiWorkersQueryDto,
  ByPositionsQueryDto,
  ExportWithCodesDto,
  ExportWithCodesByYearDto,
  ExportByPositionQueryDto,
  ExportMultiWorkersQueryDto,
  ExportDecodingByMonthQueryDto,
} from '@/modules/economist/statements/dto/statement.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('Economist / Statements')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('economist')
@Controller('api/v1/economist')
export class StatementController {
  constructor(
    private readonly service: StatementService,
    private readonly i18n: I18nService,
  ) {}

  // --- statements (apiResource) ---
  @Get('statements')
  @ApiOperation({ summary: 'List statements (paginated)' })
  async list(@Query() q: StatementListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('statements/:id')
  @ApiOperation({ summary: 'Show a single statement' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('statements')
  @ApiOperation({ summary: 'Create a statement (manual entry)' })
  async store(@Body() body: CreateStatementDto) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('statements/:id')
  @ApiOperation({ summary: 'Update a statement' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateStatementDto,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('statements/:id')
  @ApiOperation({ summary: 'Soft-delete a statement' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // --- statement extras ---
  @Get('statements-count')
  @ApiOperation({ summary: 'Statements count' })
  async count() {
    return buildSuccess(true, await this.service.statementsCount());
  }

  @Get('statement-decoding')
  @ApiOperation({ summary: 'Statement decoding by codes (yearly pivot)' })
  async decoding(@Query() q: StatementDecodingQueryDto) {
    const result = await this.service.decoding(q);
    // Laravel: is_string($result) → Helper::response($result) ({message}); aks holda data.
    return typeof result === 'string'
      ? buildSuccess(result, [])
      : buildSuccess(true, result);
  }

  @Get('statement-decoding-organizations')
  @ApiOperation({ summary: 'Statement decoding by organizations (monthly)' })
  async decodingOrgs(@Query() q: StatementDecodingByOrgQueryDto) {
    const result = await this.service.decodingByOrganization(q);
    return typeof result === 'string'
      ? buildSuccess(result, [])
      : buildSuccess(true, result);
  }

  @Get('statements-multiple-workers')
  @ApiOperation({
    summary: 'Trigger multi-org statement workers export (background task)',
  })
  async multiWorkers(@Query() q: MultiWorkersQueryDto) {
    // Laravel: exportMultipleStatementWorkers — UserExportTask yaratadi + fonda
    // Excel quradi, javob faqat success xabari (Helper::response(trans(...))).
    await this.service.multiWorkers(q);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Get('statements-by-positions')
  @ApiOperation({ summary: 'Workers by positions — background export task' })
  async byPositions(@Query() q: ByPositionsQueryDto) {
    // Laravel downloadWorkersByPositions — UserExportTask + fonda Excel.
    await this.service.byPositions(q);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  // --- example ---
  @Get('statement-example')
  @ApiOperation({ summary: 'Get statement Excel template URL' })
  example() {
    return buildSuccess(true, this.service.example());
  }

  // ============================================================
  // EXCEL EXPORTLAR — to'g'ridan-to'g'ri .xlsx download
  // ============================================================

  @Post('statements-export-with-codes')
  @HttpCode(200) // Laravel Helper::response — async task, 200
  @ApiOperation({
    summary:
      'Export statements with codes — background task (workers/organizations)',
  })
  async exportWithCodes(@Body() body: ExportWithCodesDto) {
    // Laravel: UserExportTask yaratadi + fonda job (by-workers / by-organizations),
    // javob faqat success xabari.
    await this.service.exportWithCodes(body);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Post('statements-export-with-codes-by-year')
  @HttpCode(200) // Laravel Helper::response — async task, 200
  @ApiOperation({
    summary: 'Export statements with codes by year — background task',
  })
  async exportWithCodesByYear(@Body() body: ExportWithCodesByYearDto) {
    await this.service.exportWithCodesByYear(body);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Get('statements-export-by-position')
  @RawResponse()
  @Header('Content-Type', XLSX_MIME)
  @ApiOperation({ summary: 'Export workers × monthly total_four matrix' })
  async exportByPosition(
    @Query() q: ExportByPositionQueryDto,
    @Res() res: Response,
  ) {
    const y = q.year ?? new Date().getFullYear();
    const buffer = await this.service.exportByPosition(y, {
      organizations: q.organizations,
      organization_id: q.organization_id,
      positions: q.positions,
    });
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="statements-by-position-${y}.xlsx"`,
    );
    res.end(buffer);
  }

  @Get('statements-export-multiple-workers')
  @RawResponse()
  @Header('Content-Type', XLSX_MIME)
  @ApiOperation({
    summary: 'Export workers having statements in multiple organizations',
  })
  async exportMultiWorkers(
    @Query() q: ExportMultiWorkersQueryDto,
    @Res() res: Response,
  ) {
    const y = q.year ?? new Date().getFullYear();
    const m = q.month ?? new Date().getMonth() + 1;
    const buffer = await this.service.exportMultiWorkers(y, m);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="multi-workers-${y}-${m}.xlsx"`,
    );
    res.end(buffer);
  }

  @Get('statements-export-decoding-by-month')
  @RawResponse()
  @Header('Content-Type', XLSX_MIME)
  @ApiOperation({ summary: 'Export decoding-by-month aggregation' })
  async exportDecodingByMonth(
    @Query() q: ExportDecodingByMonthQueryDto,
    @Res() res: Response,
  ) {
    const y = q.year ?? new Date().getFullYear();
    const buffer = await this.service.exportDecodingByMonth(y);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="decoding-${y}.xlsx"`,
    );
    res.end(buffer);
  }
}
