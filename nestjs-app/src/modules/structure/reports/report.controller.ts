import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { ReportService } from '@/modules/structure/reports/report.service';
import {
  QueryReportDto,
  QueryReportMonthDto,
  QueryReportStatDto,
  ReportExcelDto,
  ReportGenerateDto,
  ReportStoreDto,
  UpdateReportMonthDto,
  ReportListResponseDto,
  ReportMonthPerListResponseDto,
  ReportUpdateDto,
  ReportDetailUpdateDto,
  ReportCreateConfirmationDto,
} from '@/modules/structure/reports/dto/report.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Laravel: Route::apiResource('reports', ...) + reports-detail/{id} (PUT/DELETE) +
// report/* (generate, store, excel, labels, create-confirmation, delete-confirmation) +
// reports-stat + reports-per-month (GET/PUT/DELETE).
//
// Bizning qamrov: index, destroy, removeDetail, removeConfirmation, monthPer (CRUD).
@ApiTags('Structure / Reports')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/structure')
export class ReportController {
  constructor(
    private readonly service: ReportService,
    private readonly i18n: I18nService,
  ) {}

  @Get('reports')
  @ApiOperation({ summary: 'Reports list (active only)' })
  @ApiOkResponse({ type: ReportListResponseDto })
  async findAll(@Query() query: QueryReportDto) {
    return this.service.findAll(query);
  }

  // POST /reports — Laravel: ReportController::store().
  // Generate qilingan hisobotni yakuniy tasdiqlash (.docx/.pdf hujjat bilan).
  @Post('reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit (store) a generated report' })
  @ApiOkResponse()
  async store(@Body() dto: ReportStoreDto) {
    await this.service.store(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  // GET /reports-stat — Laravel: ReportController::stats().
  @Get('reports-stat')
  @ApiOperation({
    summary: 'Reports stats — organization tree with period reports',
  })
  @ApiOkResponse()
  async stats(@Query() query: QueryReportStatDto) {
    return this.service.stats(query);
  }

  // GET /report/labels — Laravel: ReportController::labels(). Raw massiv qaytadi.
  @Get('report/labels')
  @RawResponse()
  @ApiOperation({ summary: 'Report stat labels list' })
  @ApiOkResponse()
  labels() {
    return this.service.labels();
  }

  // POST /report/generate — Laravel: ReportController::generate().
  // O'tgan oy uchun tanlangan tashkilotlar bo'yicha hisobot yaratadi.
  @Post('report/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate report for organizations (previous month)',
  })
  @ApiOkResponse()
  async generate(@Body() dto: ReportGenerateDto) {
    return this.service.generate(dto);
  }

  // POST /report/excel — Laravel: ReportController::viewExcel.
  // type one/two/three — saqlangan hisobotni .xlsx fayl sifatida yuklab beradi.
  @Post('report/excel')
  @HttpCode(HttpStatus.OK)
  @RawResponse()
  @Header('Content-Type', XLSX_MIME)
  @ApiOperation({ summary: 'Download report Excel (type one/two/three)' })
  async viewExcel(@Body() dto: ReportExcelDto, @Res() res: Response) {
    const { buffer, filename } = await this.service.viewExcel(dto);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete report (soft)' })
  @ApiOkResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Delete('reports-detail/:detailId')
  @ApiOperation({ summary: 'Delete report detail (soft)' })
  @ApiOkResponse()
  async removeDetail(@Param('detailId', ParseIntPipe) detailId: number) {
    await this.service.removeDetail(detailId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Delete('report/delete-confirmation/:confirmationId')
  @ApiOperation({ summary: 'Delete confirmation worker' })
  @ApiOkResponse()
  async deleteConfirmation(
    @Param('confirmationId', ParseIntPipe) confirmationId: number,
  ) {
    await this.service.deleteConfirmation(confirmationId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('reports-per-month')
  @ApiOperation({ summary: 'Reports per month organizations list' })
  @ApiOkResponse({ type: ReportMonthPerListResponseDto })
  async findAllMonthPer(@Query() query: QueryReportMonthDto) {
    return this.service.findAllMonthPer(query);
  }

  @Put('reports-per-month')
  @ApiOperation({ summary: 'Bulk upsert reports per month organizations' })
  @ApiOkResponse()
  async upsertMonthPer(@Body() dto: UpdateReportMonthDto) {
    await this.service.upsertMonthPer(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('reports-per-month/:id')
  @ApiOperation({ summary: 'Delete report month organization' })
  @ApiOkResponse()
  async removeMonthPer(@Param('id', ParseIntPipe) id: number) {
    await this.service.removeMonthPer(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // POST /report/store — Laravel ReportController::store (apiResource POST reports alias).
  @Post('report/store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit (store) a generated report — alias' })
  async storeAlias(@Body() dto: ReportStoreDto) {
    await this.service.store(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  // POST /report/create-confirmation — Laravel ReportController::createConfirmation.
  @Post('report/create-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add director confirmation worker to report' })
  async createConfirmation(@Body() dto: ReportCreateConfirmationDto) {
    await this.service.createConfirmation(dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  // PUT /reports-detail/:detailId — Laravel ReportController::updateDetail.
  @Put('reports-detail/:detailId')
  @ApiOperation({ summary: 'Update report detail data + regenerate document' })
  async updateDetail(
    @Param('detailId', ParseIntPipe) detailId: number,
    @Body() dto: ReportDetailUpdateDto,
  ) {
    await this.service.updateDetail(detailId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  // GET /reports/:uuid — Laravel ReportController::show.
  @Get('reports/:uuid')
  @ApiOperation({ summary: 'Report detail (show) by uuid' })
  async findOne(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.findOne(uuid));
  }

  // PUT /reports/:uuid — Laravel ReportController::update (director_id).
  @Put('reports/:uuid')
  @ApiOperation({ summary: 'Update report director' })
  async update(@Param('uuid') uuid: string, @Body() dto: ReportUpdateDto) {
    await this.service.update(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
