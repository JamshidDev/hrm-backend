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
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ResultService } from '@/modules/exam/results/result.service';

@ApiTags('Exam / Results')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam')
export class ResultController {
  constructor(private readonly service: ResultService) {}

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
    return buildSuccess(true, await this.service.sendToConfirmations(workerExamId, body));
  }

  @Get('results/send-confirmations/:workerExamId')
  @ApiOperation({ summary: 'Show confirmation flow history' })
  async showConfirmations(@Param('workerExamId', ParseIntPipe) workerExamId: number) {
    return buildSuccess(true, await this.service.showConfirmations(workerExamId));
  }

  @Get('results/export')
  @ApiOperation({ summary: 'Export all results to Excel' })
  async exportAll() {
    return buildSuccess(true, await this.service.downloadAll());
  }

  @Get('not-passed-workers')
  @ApiOperation({ summary: 'Export workers who did not pass' })
  async notPassed() {
    return buildSuccess(true, await this.service.downloadNotPassed());
  }

  @Get('check-ended-results')
  @ApiOperation({ summary: 'Run end-of-exam check (cron job)' })
  async checkEnded() {
    return buildSuccess(true, await this.service.checkEnded());
  }

  @Get('worker-exams-download/:workerExamId')
  @ApiOperation({ summary: 'Download a single result PDF/Excel' })
  async download(@Param('workerExamId', ParseIntPipe) workerExamId: number) {
    return buildSuccess(true, await this.service.downloadResult(workerExamId));
  }

  // UUID bo'yicha natija — ichki link uchun.
  @Get('worker-exams-results/:uuid')
  @ApiOperation({ summary: 'Show exam result by UUID' })
  async showByUuid(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.showByUuid(uuid));
  }
}
