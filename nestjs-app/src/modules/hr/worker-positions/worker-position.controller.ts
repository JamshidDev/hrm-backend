// WorkerPosition controller. Laravel: HR/WorkerPositionController.

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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkerPositionService } from '@/modules/hr/worker-positions/worker-position.service';
import {
  AttachDetachRoleDto,
  QueryWorkerPositionDto,
  UpdateWorkerPositionDto,
  WorkerPositionListResponseDto,
} from '@/modules/hr/worker-positions/dto/worker-position.dto';

@ApiTags('HR / Worker Positions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-positions')
export class WorkerPositionController {
  constructor(
    private readonly service: WorkerPositionService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker positions list (ACTIVE only, with joins)' })
  @ApiOkResponse({ type: WorkerPositionListResponseDto })
  async findAll(@Query() query: QueryWorkerPositionDto) {
    return this.service.findAll(query);
  }

  @Get(':uuid')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Show worker by worker_position uuid (full data)' })
  async show(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.show(uuid));
  }

  @Get(':uuid/edit')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Edit worker (WorkerShowResource shape)' })
  async edit(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.edit(uuid));
  }

  @Post(':uuid/edit/attach-role')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Attach role to worker user (by organization)' })
  async attachRole(
    @Param('uuid') uuid: string,
    @Body() dto: AttachDetachRoleDto,
  ) {
    await this.service.attachRole(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':uuid/edit/detach-role')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Detach role from worker user (by organization)' })
  async detachRole(
    @Param('uuid') uuid: string,
    @Body() dto: AttachDetachRoleDto,
  ) {
    await this.service.detachRole(uuid, dto);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }

  @Put(':id/update')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Update worker_position fields (contract/group/rank/etc.)',
  })
  async updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerPositionDto,
  ) {
    await this.service.updatePosition(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}

// Laravel: separate endpoints with HR base path.
@ApiTags('HR / Worker Positions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class WorkerPositionExtrasController {
  constructor(
    private readonly service: WorkerPositionService,
    private readonly i18n: I18nService,
  ) {}

  @Get('worker-position-info/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary:
      'Worker position info (with department/position/contract/schedule)',
  })
  async positionInfo(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.positionInfo(id));
  }

  @Get('worker-new-careers/:uuid')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'New careers for worker (all positions)' })
  async newCareers(@Param('uuid') uuid: string) {
    return buildSuccess(true, await this.service.newCareers(uuid));
  }

  @Delete('worker-new-careers/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Delete worker_position (soft delete)' })
  async deleteNewCareer(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteNewCareer(id);
    return buildSuccess(this.i18n.t('messages.successfully_deleted'), []);
  }
}
