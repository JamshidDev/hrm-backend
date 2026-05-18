// WorkerOldCareer controller. Laravel: HR/WorkerOldCareerController.

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
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerOldCareerService } from '@/modules/hr/worker-old-careers/worker-old-career.service';
import {
  QueryWorkerOldCareerDto,
  CreateWorkerOldCareerDto,
  UpdateWorkerOldCareerDto,
} from '@/modules/hr/worker-old-careers/dto/worker-old-career.dto';

// Laravel alias: PUT /api/v1/hr/worker-old-careers-sortable → same sort logic.
@ApiTags('HR / Worker Old Careers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class WorkerOldCareerSortableAliasController {
  constructor(
    private readonly service: WorkerOldCareerService,
    private readonly i18n: I18nService,
  ) {}

  @Put('worker-old-careers-sortable')
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Sort worker old careers (Laravel hyphen-URL alias)' })
  async sortableAlias(@Body() body: { orders?: Array<{ id: number; sort: number }> }) {
    await this.service.sort(body.orders ?? []);
    return buildSuccess(this.i18n.t('messages.successfully_sorted'), []);
  }
}

@ApiTags('HR / Worker Old Careers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-old-careers')
export class WorkerOldCareerController {
  constructor(
    private readonly service: WorkerOldCareerService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker old careers (by worker uuid)' })
  async findAll(@Query() query: QueryWorkerOldCareerDto) {
    return buildSuccess(true, await this.service.findAll(query.uuid));
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateWorkerOldCareerDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('sortable')
  @UseGuards(PermissionGuard) @Permission('hr')
  async sortable(@Body() body: { orders?: Array<{ id: number; sort: number }> }) {
    await this.service.sort(body.orders ?? []);
    return buildSuccess(this.i18n.t('messages.successfully_sorted'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerOldCareerDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
