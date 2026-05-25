// Worker controller. Laravel: HR/WorkerController.
//
// Routes:
//   GET    /api/v1/hr/check-worker?pin=...        — WorkerController::checkWorker (permission: hr-check-worker)
//   POST   /api/v1/hr/workers                     — store (permission: hr)
//   PUT    /api/v1/hr/workers/{id}                — update (permission: hr)
//
// Laravel index/show/destroy methods controller'da bo'sh — apiResource ulagan,
// lekin metodlar mavjud emas → 500. Parity uchun shunday qoldiramiz (NestJS yo'q metod).

import {
  Body,
  Controller,
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
import { BusinessException } from '@/common/exceptions/business.exception';
import { WorkerService } from '@/modules/hr/workers/worker.service';
import {
  CheckWorkerQueryDto,
  CreateWorkerDto,
  UpdateWorkerDto,
  WorkerInfoDto,
  WorkerWithPositionDto,
} from '@/modules/hr/workers/dto/worker.dto';

@ApiTags('HR / Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class WorkerController {
  constructor(
    private readonly service: WorkerService,
    private readonly i18n: I18nService,
  ) {}

  @Get('check-worker')
  @UseGuards(PermissionGuard)
  @Permission('hr-check-worker')
  @ApiOperation({ summary: 'Find worker by PIN (with positions)' })
  @ApiOkResponse({ type: WorkerWithPositionDto })
  async checkWorker(@Query() query: CheckWorkerQueryDto) {
    const data = await this.service.checkByPin(query.pin);
    if (!data) {
      // Laravel: 400 status with message-only.
      throw new BusinessException(400, this.i18n.t('messages.not_found'));
    }
    return buildSuccess(true, data);
  }

  @Post('workers')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({ summary: 'Create worker (with phones + user account)' })
  @ApiOkResponse({ type: WorkerInfoDto })
  async create(@Body() dto: CreateWorkerDto) {
    const data = await this.service.create(dto);
    return buildSuccess(true, data);
  }

  @Put('workers/:id')
  @UseGuards(PermissionGuard)
  @Permission('hr')
  @ApiOperation({
    summary: 'Update worker (selective fields + password reset)',
  })
  @ApiOkResponse()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkerDto,
  ) {
    await this.service.update(id, dto);
    return buildSuccess(this.i18n.t('messages.successfully_updated'), []);
  }
}
