// Teachers controller. Laravel: TeacherController (apiResource) + TeacherLessonController.
// (no-op marker)

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
import { LmsTeacherService } from '@/modules/lms/teachers/teacher.service';
import {
  TeacherListQueryDto,
  UpsertTeacherDto,
} from '@/modules/lms/teachers/dto/teacher.dto';

@ApiTags('LMS / Teachers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms')
export class LmsTeacherController {
  constructor(
    private readonly service: LmsTeacherService,
    private readonly i18n: I18nService,
  ) {}

  // ---------- apiResource /lms/teachers ----------
  @Get('teachers')
  @ApiOperation({ summary: 'List teachers (paginated)' })
  async list(@Query() q: TeacherListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('teachers/:id')
  @ApiOperation({ summary: 'Get teacher by id' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('teachers')
  @ApiOperation({ summary: 'Create teacher (updateOrCreate by lc+worker)' })
  async create(@Body() dto: UpsertTeacherDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('teachers/:id')
  @ApiOperation({ summary: 'Update teacher' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertTeacherDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('teachers/:id')
  @ApiOperation({ summary: 'Soft-delete teacher' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // ---------- /lms/teacher/lessons ----------
  @Get('teacher/lessons')
  @ApiOperation({ summary: 'Lessons assigned to current teacher' })
  async teacherLessons(@Query() q: TeacherListQueryDto) {
    return buildSuccess(true, await this.service.teacherLessons(q));
  }
}
