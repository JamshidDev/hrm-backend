// Subjects controller. Laravel: SubjectController (apiResource).

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
import { LmsSubjectService } from '@/modules/lms/subjects/subject.service';
import {
  SubjectListQueryDto,
  UpsertSubjectDto,
} from '@/modules/lms/subjects/dto/subject.dto';

@ApiTags('LMS / Subjects')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/lms/subjects')
export class LmsSubjectController {
  constructor(
    private readonly service: LmsSubjectService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List subjects (paginated)' })
  async list(@Query() q: SubjectListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject by id' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create subject' })
  async create(@Body() dto: UpsertSubjectDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subject' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertSubjectDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete subject' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
