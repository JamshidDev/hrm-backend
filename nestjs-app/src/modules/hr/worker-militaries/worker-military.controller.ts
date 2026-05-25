// WorkerMilitary controller. Laravel: HR/WorkerMilitaryServiceController.

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
import { WorkerMilitaryService } from '@/modules/hr/worker-militaries/worker-military.service';
import {
  QueryWorkerMilitaryDto,
  CreateWorkerMilitaryDto,
  UpdateWorkerMilitaryDto,
} from '@/modules/hr/worker-militaries/dto/worker-military.dto';

@ApiTags('HR / Worker Militaries')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-militaries')
export class WorkerMilitaryController {
  constructor(
    private readonly service: WorkerMilitaryService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Worker military service records (by worker uuid)' })
  async findAll(@Query() query: QueryWorkerMilitaryDto) {
    return buildSuccess(true, await this.service.findAll(query.uuid));
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async create(@Body() dto: CreateWorkerMilitaryDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerMilitaryDto,
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
