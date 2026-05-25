// WorkerRelative controller. Laravel: HR/WorkerRelativeController.

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
import { WorkerRelativeService } from '@/modules/hr/worker-relatives/worker-relative.service';
import {
  QueryWorkerRelativeDto,
  CreateWorkerRelativeDto,
  UpdateWorkerRelativeDto,
  SortableWorkerRelativeDto,
} from '@/modules/hr/worker-relatives/dto/worker-relative.dto';

// Laravel alias: PUT /api/v1/hr/worker-relatives-sortable → same sort logic.
@ApiTags('HR / Worker Relatives')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class WorkerRelativeSortableAliasController {
  constructor(
    private readonly service: WorkerRelativeService,
    private readonly i18n: I18nService,
  ) {}

  @Put('worker-relatives-sortable')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Sort worker relatives (Laravel hyphen-URL alias)' })
  async sortableAlias(@Body() body: SortableWorkerRelativeDto) {
    await this.service.sort(body.orders ?? []);
    return buildSuccess(this.i18n.t('messages.successfully_sorted'), []);
  }
}

@ApiTags('HR / Worker Relatives')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-relatives')
export class WorkerRelativeController {
  constructor(
    private readonly service: WorkerRelativeService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker relatives (by worker uuid)' })
  async findAll(@Query() query: QueryWorkerRelativeDto) {
    return buildSuccess(
      true,
      await this.service.findAll(query.uuid, query.search),
    );
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async create(@Body() dto: CreateWorkerRelativeDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put('sortable')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async sortable(@Body() body: SortableWorkerRelativeDto) {
    await this.service.sort(body.orders ?? []);
    return buildSuccess(this.i18n.t('messages.successfully_sorted'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerRelativeDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
