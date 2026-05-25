// Vacancy exam controller. Laravel: Vacancy/VacancyExamController.
// Barcha endpointlar auth talab qiladi (Laravel: auth:vacancy).
// ESLATMA: vacancy guard hali yo'q — hozircha AuthHybridGuard.

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { VacancyExamService } from '@/modules/vacancy/exams/exam.service';
import { StartExamDto } from '@/modules/vacancy/exams/dto/exam.dto';

@ApiTags('Vacancy / Exams')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/vacancies/applications')
export class VacancyExamController {
  constructor(
    private readonly service: VacancyExamService,
    private readonly i18n: I18nService,
  ) {}

  @Post(':id/exam/start')
  @ApiOperation({ summary: 'Start a vacancy application exam' })
  async start(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartExamDto,
  ) {
    return buildSuccess(true, await this.service.start(id, dto));
  }

  @Post(':id/exam/:vacancyExamId/send-result/:questionId')
  @ApiOperation({ summary: 'Send a single exam question answer' })
  async sendResult(
    @Param('id', ParseIntPipe) _id: number,
    @Param('vacancyExamId', ParseIntPipe) vacancyExamId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() body: Record<string, unknown>,
  ) {
    await this.service.sendResult(vacancyExamId, questionId, body);
    return buildSuccess(
      this.i18n.t('messages.exam.result_updated_successfully'),
      [],
    );
  }

  @Post(':id/exam/:vacancyExamId/continue')
  @ApiOperation({ summary: 'Continue an in-progress exam' })
  async continueExam(
    @Param('id', ParseIntPipe) _id: number,
    @Param('vacancyExamId', ParseIntPipe) vacancyExamId: number,
  ) {
    return buildSuccess(true, await this.service.continue(vacancyExamId));
  }

  @Post(':id/exam/:vacancyExamId/finish')
  @ApiOperation({ summary: 'Finish an exam and finalize the result' })
  async finishExam(
    @Param('id', ParseIntPipe) id: number,
    @Param('vacancyExamId', ParseIntPipe) vacancyExamId: number,
  ) {
    return buildSuccess(
      this.i18n.t('messages.exam.finished'),
      await this.service.finish(id, vacancyExamId),
    );
  }

  @Get(':id/exam/:vacancyExamId/results')
  @ApiOperation({ summary: 'Get exam result' })
  async results(
    @Param('id', ParseIntPipe) _id: number,
    @Param('vacancyExamId', ParseIntPipe) vacancyExamId: number,
  ) {
    return buildSuccess(true, await this.service.results(vacancyExamId));
  }
}
