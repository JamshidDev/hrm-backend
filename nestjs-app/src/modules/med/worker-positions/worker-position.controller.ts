// Med worker positions controller. Laravel: Med/WorkerController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { MedWorkerPositionService } from '@/modules/med/worker-positions/worker-position.service';

@ApiTags('Med / Worker Positions')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/med')
export class MedWorkerPositionController {
  constructor(private readonly service: MedWorkerPositionService) {}

  @Get('worker-positions')
  @ApiOperation({ summary: 'List worker positions eligible for medical check' })
  async list(@Query() query: any) {
    return buildSuccess(true, await this.service.list(query));
  }
}
