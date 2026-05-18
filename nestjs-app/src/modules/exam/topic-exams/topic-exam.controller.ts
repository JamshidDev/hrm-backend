// Topic exam controller. Laravel: Exam/TopicExamController + TopicExamQuestionController.
// apiResource: /api/v1/exam/topics/{topicId}/exams + filter/exams + solved-workers + attach-question.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TopicExamService } from '@/modules/exam/topic-exams/topic-exam.service';
import {
  CreateExamDto,
  QueryTopicExamDto,
  UpdateExamDto,
} from '@/modules/exam/topic-exams/dto/topic-exam.dto';

@ApiTags('Exam / Topic Exams')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam')
export class TopicExamController {
  constructor(
    private readonly service: TopicExamService,
    private readonly i18n: I18nService,
  ) {}

  // Barcha imtihonlar dropdown'i — Laravel `filter/exams` (paginatsiya bilan).
  @Get('filter/exams')
  @ApiOperation({ summary: 'Exams list (paginated) for filter dropdowns' })
  async filter(@Query() q: QueryTopicExamDto) {
    return buildSuccess(true, await this.service.filter(q));
  }

  @Get('topics/:topicId/exams')
  @ApiOperation({ summary: 'List exams under a topic' })
  async list(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Query() q: QueryTopicExamDto,
  ) {
    return buildSuccess(true, await this.service.list(topicId, q));
  }

  @Get('topics/:topicId/exams/:examId')
  @ApiOperation({ summary: 'Get a single exam under a topic' })
  async show(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return buildSuccess(true, await this.service.show(topicId, examId));
  }

  @Post('topics/:topicId/exams')
  @ApiOperation({ summary: 'Create an exam under a topic' })
  async store(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Body() dto: CreateExamDto,
  ) {
    await this.service.create(topicId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored') as string, []);
  }

  @Put('topics/:topicId/exams/:examId')
  @ApiOperation({ summary: 'Update an exam' })
  async update(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: UpdateExamDto,
  ) {
    await this.service.update(topicId, examId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Delete('topics/:topicId/exams/:examId')
  @ApiOperation({ summary: 'Soft-delete an exam' })
  async destroy(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    await this.service.remove(topicId, examId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }

  @Get('topics/:topicId/exams/:examId/solved-workers')
  @ApiOperation({ summary: 'Workers who completed this exam' })
  async solvedWorkers(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('examId', ParseIntPipe) examId: number,
    @Query() q: QueryTopicExamDto,
  ) {
    return buildSuccess(true, await this.service.solvedWorkers(topicId, examId, q));
  }

  // POST: imtihon savoliga link biriktirish.
  @Post('topics/:topicId/exams/:examId/attach-question')
  @ApiOperation({ summary: 'Attach a category question to this exam' })
  async attachQuestion(
    @Param('examId', ParseIntPipe) examId: number,
    @Body() body: any,
  ) {
    return buildSuccess(true, await this.service.attachQuestion(examId, body));
  }

  // GET: imtihonga biriktirilgan savollar ro'yxati.
  @Get('topics/:topicId/exams/:examId/attach-question')
  @ApiOperation({ summary: 'Attached questions for the exam' })
  async getAttachedQuestions(
    @Param('examId', ParseIntPipe) examId: number,
    @Query() q: QueryTopicExamDto,
  ) {
    return buildSuccess(true, await this.service.questions(examId, q));
  }
}
