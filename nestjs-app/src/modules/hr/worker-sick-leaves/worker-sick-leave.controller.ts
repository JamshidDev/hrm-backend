// WorkerSickLeave controller. Laravel: HR/WorkerSickLeaveController.

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
import { WorkerSickLeaveService } from '@/modules/hr/worker-sick-leaves/worker-sick-leave.service';
import {
  QueryWorkerSickLeaveDto,
  CreateWorkerSickLeaveDto,
  UpdateWorkerSickLeaveDto,
} from '@/modules/hr/worker-sick-leaves/dto/worker-sick-leave.dto';

@ApiTags('HR / Worker Sick Leaves')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-sick-leaves')
export class WorkerSickLeaveController {
  constructor(
    private readonly service: WorkerSickLeaveService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker sick leaves (filtered by worker uuid)' })
  async findAll(@Query() query: QueryWorkerSickLeaveDto) {
    return buildSuccess(true, await this.service.findAll(query.uuid));
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async create(@Body() dto: CreateWorkerSickLeaveDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerSickLeaveDto,
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
