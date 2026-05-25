// HR Dashboard controller. Laravel: HR/Dashboard/DashboardController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import { DashboardService } from '@/modules/hr/dashboard/dashboard.service';
import { DashboardQueryDto } from '@/modules/hr/dashboard/dto/dashboard.dto';

@ApiTags('HR / Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('dashboard')
  @UseGuards(PermissionGuard)
  @Permission('hr-dashboard')
  @ApiOperation({
    summary: 'Dashboard main stats (workers/contracts/vacations/birthdays)',
  })
  async index(@Query() q: DashboardQueryDto) {
    return buildSuccess(true, await this.service.index(q));
  }

  @Get('dashboard-two')
  @UseGuards(PermissionGuard)
  @Permission('hr-dashboard')
  @ApiOperation({ summary: 'Dashboard meds/disciplinary/incentives stats' })
  async indexTwo(@Query() q: DashboardQueryDto) {
    return buildSuccess(true, await this.service.indexTwo(q));
  }

  @Get('dashboard-three')
  @UseGuards(PermissionGuard)
  @Permission('hr-dashboard')
  @ApiOperation({ summary: 'Dashboard disabilities + sick leaves stats' })
  async indexThree(@Query() q: DashboardQueryDto) {
    return buildSuccess(true, await this.service.indexThree(q));
  }
}
