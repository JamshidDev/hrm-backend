// Worker category controller. Laravel: Economist/WorkerCategoryController.

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { WorkerCategoryService } from '@/modules/economist/worker-categories/worker-category.service';
import {
  WorkerCategoryListQueryDto,
  CreateWorkerCategoryDto,
  UpdateWorkerCategoryDto,
  WorkerCategoryOrgReportQueryDto,
} from '@/modules/economist/worker-categories/dto/worker-category.dto';

@ApiTags('Economist / Worker Categories')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/economist')
export class WorkerCategoryController {
  constructor(
    private readonly service: WorkerCategoryService,
    private readonly i18n: I18nService,
  ) {}

  @Get('worker-categories')
  @ApiOperation({ summary: 'List worker categories (12 months by year)' })
  async list(@Query() q: WorkerCategoryListQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('worker-categories/:id')
  @ApiOperation({ summary: 'Show a worker category' })
  async show(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.show(id));
  }

  @Post('worker-categories')
  @HttpCode(200) // Laravel Helper::response — 200 (NestJS default 201 emas)
  @ApiOperation({
    summary: 'Upsert worker category (org from auth user, year, month)',
  })
  async store(@Body() body: CreateWorkerCategoryDto) {
    await this.service.create(body);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('worker-categories/:id')
  @ApiOperation({ summary: 'Update a worker category' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateWorkerCategoryDto,
  ) {
    await this.service.update(id, body);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete('worker-categories/:id')
  @ApiOperation({ summary: 'Delete a worker category (hard delete)' })
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Get('worker-category-organizations')
  @ApiOperation({
    summary: 'Worker categories report grouped by organizations (tree)',
  })
  async reportByOrgs(@Query() q: WorkerCategoryOrgReportQueryDto) {
    return buildSuccess(true, await this.service.reportByOrganizations(q));
  }
}
