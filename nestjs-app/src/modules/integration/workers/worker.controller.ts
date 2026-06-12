// Integration workers controller.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationWorkerService } from '@/modules/integration/workers/worker.service';
import { IntegrationPageQueryDto } from '@/modules/integration/_shared/page-query.dto';
import {
  TurnstileEventsDayQueryDto,
  TurnstileEventsMonthQueryDto,
  WorkerByPinQueryDto,
  WorkersByPinsDto,
} from '@/modules/integration/workers/dto/worker.dto';

@ApiTags('Integration / Workers')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/integration')
export class IntegrationWorkerController {
  constructor(private readonly service: IntegrationWorkerService) {}

  @Get('workers')
  @ApiOperation({ summary: 'List workers (paginated + search)' })
  async list(@Query() q: IntegrationPageQueryDto) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Post('workers/by-pins')
  @HttpCode(200)
  @ApiOperation({ summary: 'Workers lookup by PIN array' })
  async byPins(@Body() dto: WorkersByPinsDto) {
    return buildSuccess(true, await this.service.byPins(dto));
  }

  @Get('worker-by-pin')
  @ApiOperation({ summary: 'Single worker by PIN (?pin=...)' })
  async byPin(@Query() q: WorkerByPinQueryDto) {
    return buildSuccess(true, await this.service.byPin(q));
  }

  @Get('worker/show/:workerUuid')
  @ApiOperation({ summary: 'Worker detail by UUID' })
  async showByUuid(@Param('workerUuid') uuid: string) {
    return buildSuccess(true, await this.service.showByUuid(uuid));
  }

  @Get('worker/turnstile-events-month/:workerUuid')
  @ApiOperation({ summary: 'Worker turnstile events by month (daily minutes)' })
  async turnstileEventsByMonth(
    @Param('workerUuid') uuid: string,
    @Query() q: TurnstileEventsMonthQueryDto,
  ) {
    return buildSuccess(
      true,
      await this.service.turnstileEventsByMonth(uuid, q.year, q.month),
    );
  }

  @Get('worker/turnstile-events-day/:workerUuid')
  @ApiOperation({ summary: 'Worker turnstile events by day' })
  async turnstileEventsByDay(
    @Param('workerUuid') uuid: string,
    @Query() q: TurnstileEventsDayQueryDto,
  ) {
    return buildSuccess(
      true,
      await this.service.turnstileEventsByDay(uuid, q.date),
    );
  }
}
