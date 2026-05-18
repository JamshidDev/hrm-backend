// WorkerRelativeDisability controller. Laravel: HR/WorkerRelativeDisabilityController.
// apiResource — index/store/show/update/destroy.
//
// NOTE: Laravel hozir bu endpoint'da 500 qaytaradi (model'da scopeFilter yo'q —
// controller `->filter()` chaqirib BadMethodCallException ko'taradi). Bizniki to'g'ri
// ishlaydi.

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
import { WorkerRelativeDisabilityService } from '@/modules/hr/worker-relative-disabilities/worker-relative-disability.service';
import {
  CreateWorkerRelativeDisabilityDto,
  QueryWorkerRelativeDisabilityDto,
  UpdateWorkerRelativeDisabilityDto,
} from '@/modules/hr/worker-relative-disabilities/dto/worker-relative-disability.dto';

@ApiTags('HR / Worker Relative Disabilities')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/worker-relative-disabilities')
export class WorkerRelativeDisabilityController {
  constructor(
    private readonly service: WorkerRelativeDisabilityService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Worker relative disabilities (filter by worker_relative_id)' })
  async findAll(@Query() query: QueryWorkerRelativeDisabilityDto) {
    return buildSuccess(true, await this.service.findAll(query.worker_relative_id));
  }

  @Get(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return buildSuccess(true, await this.service.findOne(id));
  }

  @Post()
  @UseGuards(PermissionGuard) @Permission('hr')
  async create(@Body() dto: CreateWorkerRelativeDisabilityDto) {
    await this.service.create(dto);
    return buildSuccess(this.i18n.t('messages.successfully_stored'), []);
  }

  @Put(':id')
  @UseGuards(PermissionGuard) @Permission('hr')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerRelativeDisabilityDto,
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
