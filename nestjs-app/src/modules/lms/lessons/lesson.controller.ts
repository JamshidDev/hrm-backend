// Lessons controller. Laravel: LessonController + LessonMeetController.

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
import { LmsLessonService } from '@/modules/lms/lessons/lesson.service';
import {
  LessonListQueryDto,
  UpsertLessonDto,
} from '@/modules/lms/lessons/dto/lesson.dto';

@ApiTags('LMS / Lessons')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms/lessons')
export class LmsLessonController {
  constructor(
    private readonly service: LmsLessonService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List lessons (paginated)' })
  async list(@Query() q: LessonListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by id' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create lesson' })
  async create(@Body() dto: UpsertLessonDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update lesson' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertLessonDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete lesson' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get(':lesson/show-participants')
  @ApiOperation({ summary: 'List lesson participants' })
  async showParticipants(@Param('lesson', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.service.showParticipants(lessonId));
  }

  @Get(':lesson/create-meet')
  @ApiOperation({ summary: 'Create Zoom meeting for lesson (stub)' })
  async createZoomMeeting(@Param('lesson', ParseIntPipe) lessonId: number) {
    return buildSuccess(true, await this.service.createZoomMeeting(lessonId));
  }
}
