// Economist dashboard controller. Laravel: Economist/DashboardController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { DashboardService } from '@/modules/economist/dashboard/dashboard.service';
import { DashboardQueryDto } from '@/modules/economist/dashboard/dto/dashboard-query.dto';

@ApiTags('Economist / Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('economist')
@Controller('api/v1/economist')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Last 8 months aggregated statistics' })
  async index(@Query() q: DashboardQueryDto) {
    return buildSuccess(true, await this.service.index(q));
  }
}
