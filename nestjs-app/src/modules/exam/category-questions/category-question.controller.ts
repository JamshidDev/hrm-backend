// Category question controller. Laravel: Exam/TopicQuestionController.

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
import { CategoryQuestionService } from '@/modules/exam/category-questions/category-question.service';
import {
  CreateQuestionDto,
  QueryCategoryQuestionDto,
  UpdateQuestionDto,
} from '@/modules/exam/category-questions/dto/category-question.dto';

@ApiTags('Exam / Category Questions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/exam/categories/:categoryId/questions')
export class CategoryQuestionController {
  constructor(
    private readonly service: CategoryQuestionService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List questions under a category (with options)' })
  async list(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() q: QueryCategoryQuestionDto,
  ) {
    return buildSuccess(true, await this.service.list(categoryId, q));
  }

  @Get(':questionId')
  @ApiOperation({ summary: 'Get a single question with options' })
  async show(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return buildSuccess(true, await this.service.show(categoryId, questionId));
  }

  @Post()
  @ApiOperation({ summary: 'Create a question with options' })
  async store(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateQuestionDto,
  ) {
    return buildSuccess(
      this.i18n.t('messages.successfully_stored') as string,
      await this.service.create(categoryId, dto),
    );
  }

  @Put(':questionId')
  @ApiOperation({ summary: 'Update a question' })
  async update(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    await this.service.update(categoryId, questionId, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated') as string, []);
  }

  @Delete(':questionId')
  @ApiOperation({ summary: 'Soft-delete a question' })
  async destroy(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    await this.service.remove(categoryId, questionId);
    return buildSuccess(this.i18n.t('messages.successfully_deleted') as string, []);
  }
}
