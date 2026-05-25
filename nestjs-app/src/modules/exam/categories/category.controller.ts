// Exam category controller. Laravel: Exam/ExamCategoryController.

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
import { CategoryService } from '@/modules/exam/categories/category.service';
import {
  CreateCategoryDto,
  QueryCategoryDto,
  UpdateCategoryDto,
} from '@/modules/exam/categories/dto/category.dto';

@ApiTags('Exam / Categories')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam/categories')
export class CategoryController {
  constructor(
    private readonly service: CategoryService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List exam question categories' })
  async list(@Query() q: QueryCategoryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  async store(@Body() dto: CreateCategoryDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a category' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  // Kategoriya ichidagi barcha savollarni o'chirish.
  @Get(':categoryId/clear')
  @ApiOperation({ summary: 'Soft-delete all questions under a category' })
  async clear(@Param('categoryId', ParseIntPipe) categoryId: number) {
    await this.service.clear(categoryId);
    return buildSuccess(true, { success: true });
  }

  // Excel import uchun ustun nomlari.
  @Post(':categoryId/excel-header')
  @ApiOperation({ summary: 'Get expected Excel header columns for import' })
  async excelHeader(@Param('categoryId', ParseIntPipe) _categoryId: number) {
    return buildSuccess(true, this.service.excelHeader());
  }

  // Excel orqali savollar yuklash (stub: job dispatch).
  @Post(':categoryId/import')
  @ApiOperation({ summary: 'Import category questions from Excel (stub)' })
  async excelImport(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() body: any,
  ) {
    return buildSuccess(true, await this.service.excelImport(categoryId, body));
  }
}
