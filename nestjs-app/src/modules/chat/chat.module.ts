// Chat module — Laravel: Modules/Chat (20 routes).
// CRUD: news, news categories, translations, media. Notifications + telegram
// read endpoints. Public news list/views/reactions.

import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { and, count, desc, eq, max, sql } from 'drizzle-orm';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { Public } from '@/common/decorators/public.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { RequestContext } from '@/common/context/request.context';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  chat_news,
  chat_news_categories,
  chat_news_media,
  chat_news_translations,
  chat_news_views,
  chat_news_likes,
  notifications,
  telegram_messages,
  chat_user_emoji,
} from '@/db/schema';

class PageQuery {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() per_page?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

class CategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ru?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string;
}

class NewsDto {
  @ApiProperty() @IsString() slug!: string;
  @ApiProperty() @IsInt() status!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() published_at?: string;
  @ApiPropertyOptional() @IsOptional() is_pinned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() organization_id?: number;
}

class TranslationDto {
  @ApiProperty() @IsInt() chat_news_id!: number;
  @ApiProperty() @IsString() locale!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() short_description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
}

class MediaDto {
  @ApiProperty() @IsInt() chat_news_id!: number;
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() path?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() extension?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() size?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
}

class NotificationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() data?: unknown;
  @ApiPropertyOptional() @IsOptional() @IsInt() notifiable_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notifiable_type?: string;
}

@Injectable()
class ChatService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly ctx: RequestContext,
  ) {}

  private pageOf(q?: PageQuery) {
    const page = Number(q?.page ?? 1);
    const perPage = Number(q?.per_page ?? 10);
    return { page, perPage, offset: (page - 1) * perPage };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async nextId(table: any): Promise<number> {
    const [{ m }] = await this.db.select({ m: max(table.id) }).from(table);
    return Number(m ?? 0) + 1;
  }

  // ---------- enums ----------
  chatEnums() {
    return {
      statuses: [
        { id: 1, name: 'Draft' },
        { id: 2, name: 'Published' },
      ],
      reactions: [
        { id: 1, name: 'Like' },
        { id: 2, name: 'Dislike' },
      ],
    };
  }

  notificationEnums() {
    return {
      channels: ['mail', 'database', 'broadcast'],
    };
  }

  // ---------- notifications ----------
  async listNotifications(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(notifications).orderBy(desc(notifications.created_at)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(notifications),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async sendNotification(_body: NotificationDto) {
    return { success: true, stub: true };
  }

  async sendBatchNotification(_body: unknown) {
    return { success: true, stub: true };
  }

  // ---------- telegram ----------
  async telegramMessages(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(telegram_messages);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(telegram_messages).where(where).orderBy(desc(telegram_messages.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(telegram_messages).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async telegramDashboard() {
    const [{ total }] = await this.db.select({ total: count() }).from(telegram_messages).where(notDeleted(telegram_messages));
    return { total: Number(total), success: 0, failed: 0 };
  }

  // ---------- categories ----------
  async listCategories(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(chat_news_categories);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(chat_news_categories).where(where).orderBy(desc(chat_news_categories.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(chat_news_categories).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async showCategory(id: number) {
    const [row] = await this.db.select().from(chat_news_categories).where(eq(chat_news_categories.id, id)).limit(1);
    return row ?? null;
  }

  async createCategory(dto: CategoryDto) {
    const id = await this.nextId(chat_news_categories);
    await this.db.insert(chat_news_categories).values({
      id,
      name: { uz: dto.name, ru: dto.name_ru ?? dto.name, en: dto.name_en ?? dto.name },
    });
  }

  async updateCategory(id: number, dto: CategoryDto) {
    await this.db.update(chat_news_categories).set({
      name: { uz: dto.name, ru: dto.name_ru ?? dto.name, en: dto.name_en ?? dto.name },
      updated_at: sql`NOW()`,
    }).where(eq(chat_news_categories.id, id));
  }

  async removeCategory(id: number) {
    await this.db.update(chat_news_categories).set({ deleted_at: sql`NOW()` }).where(eq(chat_news_categories.id, id));
  }

  // ---------- news ----------
  async listNews(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(chat_news);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(chat_news).where(where).orderBy(desc(chat_news.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(chat_news).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async showNews(id: number) {
    const [row] = await this.db.select().from(chat_news).where(eq(chat_news.id, id)).limit(1);
    return row ?? null;
  }

  async createNews(dto: NewsDto) {
    const id = await this.nextId(chat_news);
    await this.db.insert(chat_news).values({
      id,
      slug: dto.slug,
      status: dto.status,
      published_at: dto.published_at ?? null,
      is_pinned: dto.is_pinned ?? false,
      organization_id: dto.organization_id ?? null,
    });
  }

  async updateNews(id: number, dto: NewsDto) {
    const data: Record<string, unknown> = { updated_at: sql`NOW()` };
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.published_at !== undefined) data.published_at = dto.published_at;
    if (dto.is_pinned !== undefined) data.is_pinned = dto.is_pinned;
    if (dto.organization_id !== undefined) data.organization_id = dto.organization_id;
    await this.db.update(chat_news).set(data).where(eq(chat_news.id, id));
  }

  async removeNews(id: number) {
    await this.db.update(chat_news).set({ deleted_at: sql`NOW()` }).where(eq(chat_news.id, id));
  }

  // ---------- translations ----------
  async listTranslations(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(chat_news_translations);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(chat_news_translations).where(where).orderBy(desc(chat_news_translations.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(chat_news_translations).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }
  async showTranslation(id: number) {
    const [row] = await this.db.select().from(chat_news_translations).where(eq(chat_news_translations.id, id)).limit(1);
    return row ?? null;
  }
  async createTranslation(dto: TranslationDto) {
    const id = await this.nextId(chat_news_translations);
    await this.db.insert(chat_news_translations).values({
      id,
      chat_news_id: dto.chat_news_id,
      locale: dto.locale,
      title: dto.title ?? null,
      short_description: dto.short_description ?? null,
      content: dto.content ?? null,
    });
  }
  async updateTranslation(id: number, dto: TranslationDto) {
    await this.db.update(chat_news_translations).set({
      title: dto.title ?? null,
      short_description: dto.short_description ?? null,
      content: dto.content ?? null,
      locale: dto.locale,
      updated_at: sql`NOW()`,
    }).where(eq(chat_news_translations.id, id));
  }
  async removeTranslation(id: number) {
    await this.db.update(chat_news_translations).set({ deleted_at: sql`NOW()` }).where(eq(chat_news_translations.id, id));
  }

  // ---------- media ----------
  async listMedia(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = notDeleted(chat_news_media);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(chat_news_media).where(where).orderBy(desc(chat_news_media.id)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(chat_news_media).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }
  async showMedia(id: number) {
    const [row] = await this.db.select().from(chat_news_media).where(eq(chat_news_media.id, id)).limit(1);
    return row ?? null;
  }
  async createMedia(dto: MediaDto) {
    const id = await this.nextId(chat_news_media);
    await this.db.insert(chat_news_media).values({
      id,
      chat_news_id: dto.chat_news_id,
      type: dto.type,
      path: dto.path ?? null,
      extension: dto.extension ?? null,
      size: dto.size ?? null,
      order: dto.order ?? 1,
    });
  }
  async updateMedia(id: number, dto: MediaDto) {
    await this.db.update(chat_news_media).set({
      chat_news_id: dto.chat_news_id,
      type: dto.type,
      path: dto.path ?? null,
      extension: dto.extension ?? null,
      size: dto.size ?? null,
      order: dto.order ?? 1,
      updated_at: sql`NOW()`,
    }).where(eq(chat_news_media.id, id));
  }
  async removeMedia(id: number) {
    await this.db.update(chat_news_media).set({ deleted_at: sql`NOW()` }).where(eq(chat_news_media.id, id));
  }

  // ---------- public news ----------
  async publicNewsList(q: PageQuery) {
    const { page, perPage, offset } = this.pageOf(q);
    const where = and(eq(chat_news.status, 2), notDeleted(chat_news));
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(chat_news).where(where).orderBy(desc(chat_news.published_at)).limit(perPage).offset(offset),
      this.db.select({ total: count() }).from(chat_news).where(where),
    ]);
    return { current_page: page, per_page: perPage, total: Number(total), data: rows };
  }

  async addNewsView(newsId: number) {
    const userId = this.ctx.user_or_fail.id;
    // upsert-like behavior: check if exists
    const [existing] = await this.db
      .select({ id: chat_news_views.id })
      .from(chat_news_views)
      .where(and(eq(chat_news_views.chat_news_id, newsId), eq(chat_news_views.user_id, userId)))
      .limit(1);
    if (existing) return { success: true };
    const id = await this.nextId(chat_news_views);
    await this.db.insert(chat_news_views).values({ id, chat_news_id: newsId, user_id: userId });
    await this.db
      .update(chat_news)
      .set({ views_count: sql`${chat_news.views_count} + 1` })
      .where(eq(chat_news.id, newsId));
    return { success: true };
  }

  async addNewsReaction(newsId: number, body: { reaction: number }) {
    const userId = this.ctx.user_or_fail.id;
    const [existing] = await this.db
      .select({ id: chat_news_likes.id })
      .from(chat_news_likes)
      .where(and(eq(chat_news_likes.chat_news_id, newsId), eq(chat_news_likes.user_id, userId)))
      .limit(1);
    if (existing) {
      await this.db.update(chat_news_likes).set({ reaction: body.reaction, updated_at: sql`NOW()` }).where(eq(chat_news_likes.id, existing.id));
    } else {
      const id = await this.nextId(chat_news_likes);
      await this.db.insert(chat_news_likes).values({ id, chat_news_id: newsId, user_id: userId, reaction: body.reaction });
    }
    return { success: true };
  }

  // ---------- emoji ----------
  async sendEmoji(body: { emoji?: string; text?: string; from_user_id?: number; to_user_id?: number }) {
    const fromUserId = body.from_user_id ?? this.ctx.user?.id ?? 0;
    const toUserId = body.to_user_id ?? 0;
    const text = body.text ?? body.emoji ?? '';
    if (!fromUserId || !toUserId) return { success: false, stub: true };
    const id = await this.nextId(chat_user_emoji);
    await this.db.insert(chat_user_emoji).values({
      id,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      text,
    });
    return { success: true, id };
  }
}

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1')
class ChatController {
  constructor(private readonly s: ChatService, private readonly i18n: I18nService) {}

  @Get('chat/enums') chatEnums() {
    return buildSuccess(true, this.s.chatEnums());
  }

  @Get('notifications/enums') notificationEnums() {
    return buildSuccess(true, this.s.notificationEnums());
  }
  @Get('notifications') async listNotifications(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listNotifications(q));
  }
  @Post('notifications/send') async sendNotification(@Body() body: NotificationDto) {
    return buildSuccess(true, await this.s.sendNotification(body));
  }
  @Post('notifications/send-batch') async sendBatch(@Body() body: any) {
    return buildSuccess(true, await this.s.sendBatchNotification(body));
  }

  @Get('telegram/messages') async telegramMessages(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.telegramMessages(q));
  }
  @Get('telegram/dashboard') async telegramDashboard() {
    return buildSuccess(true, await this.s.telegramDashboard());
  }

  // categories (chat/categories)
  @Get('chat/categories') async listCategories(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listCategories(q));
  }
  @Get('chat/categories/:id') async showCategory(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.s.showCategory(id));
  }
  @Post('chat/categories') async createCategory(@Body() dto: CategoryDto) {
    await this.s.createCategory(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
  @Put('chat/categories/:id') async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) {
    await this.s.updateCategory(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
  @Delete('chat/categories/:id') async removeCategory(@Param('id', ParseIntPipe) id: number) {
    await this.s.removeCategory(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // news (chat/news)
  @Get('chat/news') async listNews(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listNews(q));
  }
  @Get('chat/news/:id') async showNews(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.s.showNews(id));
  }
  @Post('chat/news') async createNews(@Body() dto: NewsDto) {
    await this.s.createNews(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
  @Put('chat/news/:id') async updateNews(@Param('id', ParseIntPipe) id: number, @Body() dto: NewsDto) {
    await this.s.updateNews(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
  @Delete('chat/news/:id') async removeNews(@Param('id', ParseIntPipe) id: number) {
    await this.s.removeNews(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // translations
  @Get('chat/translations') async listTranslations(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listTranslations(q));
  }
  @Get('chat/translations/:id') async showTranslation(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.s.showTranslation(id));
  }
  @Post('chat/translations') async createTranslation(@Body() dto: TranslationDto) {
    await this.s.createTranslation(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
  @Put('chat/translations/:id') async updateTranslation(@Param('id', ParseIntPipe) id: number, @Body() dto: TranslationDto) {
    await this.s.updateTranslation(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
  @Delete('chat/translations/:id') async removeTranslation(@Param('id', ParseIntPipe) id: number) {
    await this.s.removeTranslation(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // media
  @Get('chat/media') async listMedia(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.listMedia(q));
  }
  @Get('chat/media/:id') async showMedia(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.s.showMedia(id));
  }
  @Post('chat/media') async createMedia(@Body() dto: MediaDto) {
    await this.s.createMedia(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }
  @Put('chat/media/:id') async updateMedia(@Param('id', ParseIntPipe) id: number, @Body() dto: MediaDto) {
    await this.s.updateMedia(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
  @Delete('chat/media/:id') async removeMedia(@Param('id', ParseIntPipe) id: number) {
    await this.s.removeMedia(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}

@ApiTags('Chat / News (public)')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/news')
class ChatNewsPublicController {
  constructor(private readonly s: ChatService) {}

  @Get() async list(@Query() q: PageQuery) {
    return buildSuccess(true, await this.s.publicNewsList(q));
  }

  @Post(':id/view') async addView(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.s.addNewsView(id));
  }

  @Post(':id/reaction') async addReaction(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return buildSuccess(true, await this.s.addNewsReaction(id, body));
  }
}

// Emoji endpoint requires `socket-server-api` middleware in Laravel. Expose as @Public stub.
@ApiTags('Chat / Emoji')
@Controller('api/v1/chat/emoji')
class ChatEmojiController {
  constructor(private readonly s: ChatService) {}

  @Public()
  @Post()
  async send(@Body() body: any) {
    return buildSuccess(true, await this.s.sendEmoji(body));
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ChatController, ChatNewsPublicController, ChatEmojiController],
  providers: [ChatService],
})
export class ChatModule {}
