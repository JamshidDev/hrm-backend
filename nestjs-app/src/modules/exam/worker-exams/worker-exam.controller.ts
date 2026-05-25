// Worker exam controller. Laravel: Exam/WorkerExamController + DashboardController.

import {
  Body,
  Controller,
  Delete,
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
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerExamService } from '@/modules/exam/worker-exams/worker-exam.service';

@ApiTags('Exam / Worker Exams')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam/worker-exams')
export class WorkerExamController {
  constructor(
    private readonly service: WorkerExamService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List worker exams' })
  async list(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Worker exam dashboard statistics' })
  async statistics() {
    return buildSuccess(true, await this.service.statistics());
  }

  @Post(':examId/start')
  @ApiOperation({ summary: 'Start a worker exam (allocate token + questions)' })
  async start(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: any,
  ) {
    return buildSuccess(true, await this.service.start(examId, body));
  }

  @Get(':examId/continue')
  @ApiOperation({ summary: 'Continue an in-progress exam' })
  async continueExam(@Param('examId', ParseIntPipe) examId: number) {
    return buildSuccess(true, await this.service.continue(examId));
  }

  @Get(':examId/finished')
  @ApiOperation({ summary: 'Finish a worker exam and finalize results' })
  async finishExam(@Param('examId', ParseIntPipe) examId: number) {
    return buildSuccess(true, await this.service.finish(examId));
  }

  @Get(':examId/result')
  @ApiOperation({ summary: 'Get worker exam result summary' })
  async result(@Param('examId', ParseIntPipe) examId: number) {
    return buildSuccess(true, await this.service.results(examId));
  }

  @Delete(':examId')
  @ApiOperation({ summary: 'Soft-delete a worker exam attempt' })
  async destroy(@Param('examId', ParseIntPipe) examId: number) {
    await this.service.destroy(examId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Post(':examId/send-result/:questionId')
  @ApiOperation({ summary: 'Send a single question answer' })
  async sendResult(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() body: any,
  ) {
    return buildSuccess(
      true,
      await this.service.sendResult(examId, questionId, body),
    );
  }
}
