// Exam video controller. Laravel: Exam/ExamVideoController.

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ExamVideoService } from '@/modules/exam/exam-videos/exam-video.service';

@ApiTags('Exam / Videos')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam')
export class ExamVideoController {
  constructor(private readonly service: ExamVideoService) {}

  @Post('worker-exams/start-video')
  @ApiOperation({ summary: 'Start a video proctoring session' })
  async start(@Body() body: any) {
    return buildSuccess(true, await this.service.start(body));
  }

  @Put('worker-exams/finish-video')
  @ApiOperation({ summary: 'Finish a video proctoring session' })
  async finish(@Body() body: any) {
    return buildSuccess(true, await this.service.finish(body));
  }

  // Worker exam'ga tegishli video chunk'larni qaytarish.
  @Get('results/worker-exam-videos/:workerExamId')
  @ApiOperation({ summary: 'List video chunks for a worker exam' })
  async show(@Param('workerExamId', ParseIntPipe) workerExamId: number) {
    return buildSuccess(true, await this.service.show(workerExamId));
  }
}
