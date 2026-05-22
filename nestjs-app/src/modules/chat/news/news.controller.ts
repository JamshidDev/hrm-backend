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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { ChatNewsService } from '@/modules/chat/news/news.service';
import {
  CreateNewsDto,
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

  @Post()
  @ApiOperation({
    summary: 'Create news (transaction: news + translations + categories)',
  })
  async store(@Body() dto: CreateNewsDto) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update news (translations upsert per locale, categories sync)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
  ) {
    return buildSuccess(
      this.i18n.t('messages.successfully_updated'),
      await this.service.update(id, dto),
    );
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
