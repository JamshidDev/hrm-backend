import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ReportService } from '@/modules/structure/reports/report.service';
import {
  QueryReportDto,
  QueryReportMonthDto,
  UpdateReportMonthDto,
  ReportListResponseDto,
  ReportMonthPerListResponseDto,
} from '@/modules/structure/reports/dto/report.dto';

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
}
