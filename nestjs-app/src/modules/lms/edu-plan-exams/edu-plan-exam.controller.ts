// Edu-plan-exams controller. Laravel: EduPlanExamController.

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
import { LmsEduPlanExamService } from '@/modules/lms/edu-plan-exams/edu-plan-exam.service';
import {
  AttachEduPlanExamDto,
  EduPlanExamListQueryDto,
} from '@/modules/lms/edu-plan-exams/dto/edu-plan-exam.dto';

@ApiTags('LMS / Edu Plan Exams')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms/exams')
export class LmsEduPlanExamController {
  constructor(private readonly service: LmsEduPlanExamService) {}

  @Get()
  @ApiOperation({ summary: 'List edu plan exams (paginated)' })
  async list(@Query() q: EduPlanExamListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post('attach')
  @ApiOperation({ summary: 'Attach exam to edu plan' })
  async attach(@Body() dto: AttachEduPlanExamDto) {
    return buildSuccess(true, await this.service.attach(dto));
  }

  @Get('result')
  @ApiOperation({ summary: 'Exam results (stub)' })
  async results(@Query() q: EduPlanExamListQueryDto) {
    return buildSuccess(true, await this.service.results(q));
  }

  @Get('detach/:examId')
  @ApiOperation({ summary: 'Detach exam from edu plan (hard delete)' })
  async detach(@Param('examId', ParseIntPipe) examId: number) {
    return buildSuccess(true, await this.service.detach(examId));
  }
}
