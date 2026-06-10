// Worker exam controller. Laravel: Exam/WorkerExamController + DashboardController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { SendResultDto } from '@/modules/exam/worker-exams/dto/send-result.dto';

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
  async statistics(@Query() q: { from?: string; to?: string }) {
    return buildSuccess(true, await this.service.statistics(q));
  }

  @Post(':examId/start')
  @ApiOperation({ summary: 'Start a worker exam (allocate token + questions)' })
  async start(@Param('examId', ParseIntPipe) examId: number) {
    return buildSuccess(true, await this.service.start(examId));
  }

  // Laravel $request->header('active_token') — symfony header nomi `active-token`/`active_token`.
  @Get(':workerExamId/continue')
  @ApiOperation({
    summary: 'Continue an in-progress exam (active-token check)',
  })
  async continueExam(
    @Param('workerExamId', ParseIntPipe) workerExamId: number,
    @Headers('active-token') activeTokenDash?: string,
    @Headers('active_token') activeTokenUnderscore?: string,
  ) {
    return buildSuccess(
      true,
      await this.service.continue(
        workerExamId,
        activeTokenDash ?? activeTokenUnderscore,
      ),
    );
  }

  @Get(':examId/finished')
  @ApiOperation({ summary: 'Finish a worker exam and finalize results' })
  async finishExam(
    @Param('examId', ParseIntPipe) examId: number,
    @Headers('active-token') activeTokenDash?: string,
    @Headers('active_token') activeTokenUnderscore?: string,
  ) {
    return buildSuccess(
      true,
      await this.service.finish(
        examId,
        activeTokenDash ?? activeTokenUnderscore,
      ),
    );
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

  // Laravel: Helper::response(trans('messages.exam.result_updated_successfully')).
  @Post(':examId/send-result/:questionId')
  @ApiOperation({
    summary: 'Send a single question answer (active-token check)',
  })
  async sendResult(
    @Param('examId', ParseIntPipe) examId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: SendResultDto,
    @Headers('active-token') activeTokenDash?: string,
    @Headers('active_token') activeTokenUnderscore?: string,
  ) {
    await this.service.sendResult(
      examId,
      questionId,
      dto.result,
      activeTokenDash ?? activeTokenUnderscore,
    );
    return buildSuccess(
      this.i18n.t('messages.exam.result_updated_successfully'),
      [],
    );
  }
}
