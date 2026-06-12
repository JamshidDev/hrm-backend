// Chat news controller. Laravel: ChatNewsController.
// Admin CRUD: /chat/news (Route::resource — full 5 endpoint).
// Public list: /news (alohida controller — quyiroqda).

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
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatNewsService } from '@/modules/chat/news/news.service';
import {
  NewsListQueryDto,
  PublicNewsListQueryDto,
  UpdateNewsDto,
} from '@/modules/chat/news/dto/news.dto';

@ApiTags('Chat / News (admin)')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/chat/news')
export class ChatNewsAdminController {
  constructor(
    private readonly service: ChatNewsService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List news (paginated, status filter)' })
  async list(@Query() q: NewsListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Show news with translations + media + categories' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  // Frontend FormData yuboradi (bracket-notation maydonlar + media fayllari).
  // `@Body() dto` multipart'ni o'qiy olmaydi — updateMultipart singari xom
  // `req.body` + files bilan ishlaymiz (AnyFilesInterceptor). JSON body ham
  // shu yo'l bilan ishlaydi (multer multipart'gina ushlaydi).
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary:
      'Create news (multipart FormData: news + translations + categories + media)',
  })
  async store(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.service.createFromForm(
      (req.body ?? {}) as Record<string, unknown>,
      files ?? [],
    );
    // Laravel ChatNewsController::store — Helper::response(message) → data=[].
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  // PUT (JSON) — translations/categories nested JSON bilan.
  @Put(':id')
  @ApiOperation({ summary: 'Update news (JSON body)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
  ) {
    await this.service.update(id, dto);
    // Laravel ChatNewsController::update — faqat message (data yo'q).
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  // POST(:id) — frontend FormData + `_method=PUT` (method-override multipart'ni
  // o'qiy olmaydi, shuning uchun POST alias). Fayllar + bracket-notation maydonlar.
  @Post(':id')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({ summary: 'Update news (multipart FormData, _method=PUT)' })
  async updateMultipart(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.service.updateFromForm(
      id,
      (req.body ?? {}) as Record<string, unknown>,
      files ?? [],
    );
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete news' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

/**
 * Public news list — Laravel: GET /v1/news bilan `auth.hybrid` middleware.
 * Faqat status=2 (Published) + per-user is_viewed/has_liked.
 */
@ApiTags('Chat / News (public)')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/news')
export class ChatNewsPublicController {
  constructor(private readonly service: ChatNewsService) {}

  @Get()
  @ApiOperation({
    summary: 'Public news list (status=Published, user reactions)',
  })
  async list(@Query() q: PublicNewsListQueryDto) {
    return buildSuccess(true, await this.service.publicList(q));
  }
}
