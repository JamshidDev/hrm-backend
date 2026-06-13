// Integration stations controller.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationStationService } from '@/modules/integration/stations/station.service';
import { ResumeService } from '@/modules/hr/worker-exports/resume.service';
import { StationWorkersQueryDto } from '@/modules/integration/stations/dto/station-workers.dto';

@ApiTags('Integration / Stations')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('integration')
@Controller('api/v1/integration/stations')
export class IntegrationStationController {
  constructor(
    private readonly service: IntegrationStationService,
    private readonly resume: ResumeService,
  ) {}

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

  // Laravel: WorkerPosition::whereUuid({workerId}) → downloadResume — BinaryFileResponse (.docx).
  // {workerId} = worker_position UUID. ResumeService.generate shu uuidni qabul qiladi.
  @Get(':code/workers/:workerId/resume')
  @ApiOperation({ summary: 'Station worker resume DOCX' })
  async workerResume(
    @Param('workerId') workerId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.resume.generate(workerId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  @Get(':code/stats')
  @ApiOperation({ summary: 'Station stats (stub)' })
  async stats(@Param('code') code: string) {
    return buildSuccess(true, await this.service.stats(code));
  }
}
