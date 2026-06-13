// Exam result controller. Laravel: Exam/ResultController.
// `worker-exams-download/:id` va `worker-exams-results/:uuid` bu yerda ham bor
// (Laravel route'iga qarab).

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { BusinessException } from '@/common/exceptions/business.exception';
import { buildSuccess } from '@/common/utils/response.util';
import { ResultService } from '@/modules/exam/results/result.service';

@ApiTags('Exam / Results')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam')
export class ResultController {
  constructor(
    private readonly service: ResultService,
    private readonly i18n: I18nService,
  ) {}

  @Get('results')
  @ApiOperation({ summary: 'List exam results' })
  async list(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post('results/send-confirmations/:workerExamId')
  @ApiOperation({ summary: 'Send a result to confirmation flow' })
  async sendToConfirmations(
    @Param('workerExamId', ParseIntPipe) workerExamId: number,
    @Body() body: any,
  ) {
    return buildSuccess(
      true,
      await this.service.sendToConfirmations(workerExamId, body),
    );
  }

  @Get('results/send-confirmations/:workerExamId')
  @ApiOperation({ summary: 'Show confirmation flow history' })
  async showConfirmations(
    @Param('workerExamId', ParseIntPipe) workerExamId: number,
  ) {
    return buildSuccess(
      true,
      await this.service.showConfirmations(workerExamId),
    );
  }

  @Get('results/export')
  @ApiOperation({ summary: 'Export all results to Excel (background)' })
  async exportAll(@Query() q: Record<string, string>) {
    await this.service.downloadAll(q);
    // Laravel: Helper::response(trans('messages.successfully_exported'))
    //   → {message: <translated>, error: false, data: []}.
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Get('not-passed-workers')
  @ApiOperation({ summary: 'Export workers who did not pass (background)' })
  async notPassed(@Query() q: Record<string, string>) {
    await this.service.downloadNotPassed(q);
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }

  @Get('check-ended-results')
  @ApiOperation({ summary: 'Run end-of-exam check (cron job)' })
  async checkEnded() {
    // Laravel: Helper::response(trans('messages.successfully_updated'))
    //   → {message: <translated>, error: false, data: []}.
    await this.service.checkEnded();
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Get('worker-exams-download/:workerExamId')
  @ApiOperation({ summary: 'Download a single result PDF/Excel' })
  async download(
    @Param('workerExamId', ParseIntPipe) workerExamId: number,
    @Query('type') typeRaw?: string,
  ) {
    // Laravel: DownloadResultRequest 'type' required.
    if (typeRaw === undefined || typeRaw === '') {
      throw new BusinessException(422, 'type is required', {
        type: ['type field is required'],
      });
    }
    const type = Number(typeRaw);
    return buildSuccess(true, await this.service.downloadResult(workerExamId, type));
  }

  // UUID bo'yicha natija — ichki link uchun.
  @Get('worker-exams-results/:uuid')
  @UseGuards(PermissionGuard)
  @Permission('document-view-exam-results')
  @ApiOperation({ summary: 'Show exam result by UUID' })
  async showByUuid(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.showByUuid(uuid));
  }
}
