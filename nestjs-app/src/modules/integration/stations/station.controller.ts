// Integration stations controller.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationStationService } from '@/modules/integration/stations/station.service';
import { StationWorkersQueryDto } from '@/modules/integration/stations/dto/station-workers.dto';

@ApiTags('Integration / Stations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/integration/stations')
export class IntegrationStationController {
  constructor(private readonly service: IntegrationStationService) {}

  @Get(':code/workers')
  @ApiOperation({ summary: 'Station workers by code (+ director, deputy)' })
  async listWorkers(
    @Param('code') code: string,
    @Query() q: StationWorkersQueryDto,
  ) {
    return buildSuccess(true, await this.service.listWorkers(code, q));
  }

  @Get(':code/workers/:workerId')
  @ApiOperation({ summary: 'Station worker detail' })
  async showWorker(
    @Param('code') code: string,
    @Param('workerId', ParseIntPipe) workerId: number,
  ) {
    return buildSuccess(true, await this.service.showWorker(code, workerId));
  }

  @Get(':code/workers/:workerId/resume')
  @ApiOperation({ summary: 'Station worker resume (stub)' })
  async workerResume(
    @Param('code') code: string,
    @Param('workerId', ParseIntPipe) workerId: number,
  ) {
    return buildSuccess(true, await this.service.workerResume(code, workerId));
  }

  @Get(':code/stats')
  @ApiOperation({ summary: 'Station stats (stub)' })
  async stats(@Param('code') code: string) {
    return buildSuccess(true, await this.service.stats(code));
  }
}
