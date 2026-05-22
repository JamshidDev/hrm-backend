// Chat news translations controller. Laravel: ChatNewsTranslationController.

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
import { ChatNewsTranslationService } from '@/modules/chat/news-translations/news-translation.service';
import {
  TranslationListQueryDto,
  UpsertTranslationDto,
} from '@/modules/chat/news-translations/dto/translation.dto';

@ApiTags('Chat / News Translations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/chat/translations')
export class ChatNewsTranslationController {
  constructor(
    private readonly service: ChatNewsTranslationService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List translations' })
  async list(@Query() q: TranslationListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Show a translation' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post()
  @ApiOperation({ summary: 'Upsert translation (per news+locale)' })
  async store(@Body() dto: UpsertTranslationDto) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a translation' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertTranslationDto,
  ) {
    return buildSuccess(
      this.i18n.t('messages.successfully_updated'),
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete translation' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
