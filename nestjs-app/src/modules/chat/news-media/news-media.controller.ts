// Chat news media controller. Laravel: ChatNewsMediaController.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatNewsMediaService } from '@/modules/chat/news-media/news-media.service';
import {
  CreateMediaDto,
  MediaListQueryDto,
} from '@/modules/chat/news-media/dto/media.dto';

@ApiTags('Chat / News Media')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/chat/media')
export class ChatNewsMediaController {
  constructor(
    private readonly service: ChatNewsMediaService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List news media' })
  async list(@Query() q: MediaListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Show media item' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  /**
   * POST /chat/media — multipart upload.
   * Body: chat_news_id, type, order. File: `file`.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        chat_news_id: { type: 'integer' },
        type: { type: 'string', example: 'image' },
        order: { type: 'integer' },
      },
      required: ['file', 'chat_news_id', 'type'],
    },
  })
  @ApiOperation({ summary: 'Upload media file (pdf/doc/png/jpg)' })
  async store(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
  ) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.create(dto, file),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete media item' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
