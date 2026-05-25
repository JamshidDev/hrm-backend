// Topic file controller. Laravel: Exam/TopicFileController.
// apiResource: /api/v1/exam/topics/{topicId}/files
//
// POST/PUT — multipart form-data: { file: <binary>, active: '0'|'1' }.
//
// Laravel HandlesExamServiceExceptions trait — istalgan xato `server_error`
// xabari bilan 400 qaytaradi. NestJS'da topicId noto'g'ri bo'lsa (masalan
// frontend 'undefined' yuborsa) shu xabar qaytariladi.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { BusinessException } from '@/common/exceptions/business.exception';
import { buildSuccess } from '@/common/utils/response.util';
import { TopicFileService } from '@/modules/exam/topic-files/topic-file.service';
import {
  CreateTopicFileDto,
  UpdateTopicFileDto,
} from '@/modules/exam/topic-files/dto/topic-file.dto';

// Frontend ba'zida `topicId="undefined"` yuborishi mumkin. Laravel uni
// (int) cast qiladi va `Topic::findOrFail(0)` 404 → 500 → server_error.
// NestJS'da bir xil shape qaytarish uchun manual parse qilamiz.
function parseTopicIdOrThrow(value: string, i18n: I18nService): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BusinessException(
      400,
      i18n.t('messages.server_error') as string,
    );
  }
  return n;
}

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
  @ApiOperation({
    summary: 'Files grouped by type (videos / images / books / audios)',
  })
  async list(@Param('topicId') topicIdRaw: string) {
    const topicId = parseTopicIdOrThrow(topicIdRaw, this.i18n);
    return buildSuccess(true, await this.service.list(topicId));
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get a single topic file' })
  async show(
    @Param('topicId') topicIdRaw: string,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    const topicId = parseTopicIdOrThrow(topicIdRaw, this.i18n);
    return buildSuccess(true, await this.service.show(topicId, fileId));
  }

  // Laravel `StoreTopicFileRequest`: { active, file: required|file }.
  @Post()
  @ApiOperation({ summary: 'Attach a file to a topic (multipart)' })
  @UseInterceptors(FileInterceptor('file'))
  async store(
    @Param('topicId') topicIdRaw: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTopicFileDto,
  ) {
    const topicId = parseTopicIdOrThrow(topicIdRaw, this.i18n);
    await this.service.create(topicId, file, dto?.active);
    return buildSuccess(
      this.i18n.t('messages.successfully_stored') as string,
      [],
    );
  }

  // Laravel `UpdateTopicFileRequest`: { active, file? }.
  @Put(':fileId')
  @ApiOperation({ summary: 'Update a topic file (multipart)' })
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('topicId') topicIdRaw: string,
    @Param('fileId', ParseIntPipe) fileId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateTopicFileDto,
  ) {
    const topicId = parseTopicIdOrThrow(topicIdRaw, this.i18n);
    await this.service.update(topicId, fileId, dto?.active, file);
    return buildSuccess(
      this.i18n.t('messages.successfully_updated') as string,
      [],
    );
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Soft-delete a topic file' })
  async destroy(
    @Param('topicId') topicIdRaw: string,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    const topicId = parseTopicIdOrThrow(topicIdRaw, this.i18n);
    await this.service.remove(topicId, fileId);
    return buildSuccess(
      this.i18n.t('messages.successfully_deleted') as string,
      [],
    );
  }
}
