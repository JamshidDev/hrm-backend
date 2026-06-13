// Integration worker check controller.

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationWorkerCheckService } from '@/modules/integration/worker-check/worker-check.service';
import { WorkerCheckDto } from '@/modules/integration/worker-check/dto/worker-check.dto';

@ApiTags('Integration / Worker Check')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('integration|integration-worker-info')
@Controller('api/v1/integration/worker')
export class IntegrationWorkerCheckController {
  constructor(private readonly service: IntegrationWorkerCheckService) {}

  @Post('check')
  @ApiOperation({ summary: 'Check worker existence by pin/uuid' })
  async check(@Body() dto: WorkerCheckDto) {
    return buildSuccess(true, await this.service.check(dto));
  }
}
