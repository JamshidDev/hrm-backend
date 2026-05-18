// Topic file controller. Laravel: Exam/TopicFileController.
// apiResource: /api/v1/exam/topics/{topicId}/files

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TopicFileService } from '@/modules/exam/topic-files/topic-file.service';
import {
  CreateTopicFileDto,
  UpdateTopicFileDto,
} from '@/modules/exam/topic-files/dto/topic-file.dto';

@ApiTags('Exam / Topic Files')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam/topics/:topicId/files')
export class TopicFileController {
  constructor(
    private readonly service: TopicFileService,
    private readonly i18n: I18nService,
  ) {}

  // Laravel: fayllar TopicFileEnum guruhlari bo'yicha qaytadi (paginatsiya YO'Q).
  @Get()
  @ApiOperation({ summary: 'Files grouped by type (videos / images / books / audios)' })
  async list(@Param('topicId', ParseIntPipe) topicId: number) {
    return buildSuccess(true, await this.service.list(topicId));
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get a single topic file' })
  async show(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    return buildSuccess(true, await this.service.show(topicId, fileId));
  }

  @Post()
  @ApiOperation({ summary: 'Attach a file to a topic' })
  async store(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Body() dto: CreateTopicFileDto,
  ) {
    await this.service.create(topicId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored') as string, []);
  }

  @Put(':fileId')
  @ApiOperation({ summary: 'Update a topic file' })
  async update(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Body() dto: UpdateTopicFileDto,
  ) {
    await this.service.update(topicId, fileId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Soft-delete a topic file' })
  async destroy(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    await this.service.remove(topicId, fileId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }
}
