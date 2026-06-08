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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
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

  // Yuklangan Excel'ni preview qilish (Laravel TopicExamQuestionController::preview).
  // categoryId 'null' bo'lishi mumkin (yangi kategoriya) → ParseIntPipe YO'Q.
  // Javob Laravel'da to'g'ridan-to'g'ri ({headers, preview}) — @RawResponse.
  @Post(':categoryId/excel-header')
  @RawResponse()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Preview uploaded Excel (headers + first rows)' })
  async excelHeader(
    @Param('categoryId') _categoryId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.previewExcel(file);
  }

  // Excel orqali savollar yuklash (stub: job dispatch).
  @Post(':categoryId/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import category questions from Excel' })
  async excelImport(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mapping: string,
    @Body('startRow') startRow: string,
  ) {
    await this.service.importExcel(
      categoryId,
      file,
      mapping,
      Number(startRow) || 1,
    );
    // Laravel: Helper::response(trans('messages.successfully_exported')).
    return buildSuccess(this.i18n.t('messages.successfully_exported'), []);
  }
}
