// Chat news categories controller. Laravel: ChatNewsCategoryController.
// Routes: /chat/categories (apiResource — index/store/update/destroy).
// `show` Laravel'da yo'q (apiResource ko'pchilik bilan birga, lekin show olib tashlangan).

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
import { ChatNewsCategoryService } from '@/modules/chat/news-categories/news-category.service';
import {
  CategoryListQueryDto,
  UpsertCategoryDto,
} from '@/modules/chat/news-categories/dto/category.dto';

@ApiTags('Chat / News Categories')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/chat/categories')
export class ChatNewsCategoryController {
  constructor(
    private readonly service: ChatNewsCategoryService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List chat news categories (paginated)' })
  async list(@Query() q: CategoryListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post()
  @ApiOperation({ summary: 'Create a category (3 til bilan)' })
  async store(@Body() dto: UpsertCategoryDto) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored'),
      await this.service.create(dto),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertCategoryDto,
  ) {
    return buildSuccess(
      this.i18n.t('messages.successfully_updated'),
      await this.service.update(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a category' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
