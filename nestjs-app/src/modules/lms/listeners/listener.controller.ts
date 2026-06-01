// Listeners controller. Laravel: ListenerController + ListenerLessonController.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { LmsListenerService } from '@/modules/lms/listeners/listener.service';
import { ListenerCalendarQueryDto } from '@/modules/lms/listeners/dto/listener.dto';

@ApiTags('LMS / Listeners')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms/listener')
export class LmsListenerController {
  constructor(private readonly service: LmsListenerService) {}

  // Laravel: GET /lms/listener → ListenerController::index (dashboard, stub).
  @Get()
  @ApiOperation({ summary: 'Listener dashboard (edu_plans + lessons + user)' })
  async index() {
    return buildSuccess(true, await this.service.index());
  }

  // Laravel: GET /lms/listener/lessons → ListenerLessonController::index (calendar).
  @Get('lessons')
  @ApiOperation({
    summary: 'Listener lessons calendar (grouped by lesson_date)',
  })
  async lessons(@Query() q: ListenerCalendarQueryDto) {
    return buildSuccess(true, await this.service.lessons(q));
  }

  // Laravel: GET /lms/listener/lessons/{lessonId} → ListenerLessonController::startLesson.
  @Get('lessons/:lessonId')
  @ApiOperation({ summary: 'Start a listener lesson (LessonStartResource)' })
  async startLesson(@Param('lessonId', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.service.startLesson(lessonId));
  }
}
