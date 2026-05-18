// Incentive controller. Laravel: HR/OrganizationIncentiveController.

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { IncentiveService } from '@/modules/hr/incentives/incentive.service';
import {
  IncentiveListResponseDto,
  QueryIncentiveDto,
} from '@/modules/hr/incentives/dto/incentive.dto';

@ApiTags('HR / Incentives')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr/incentives')
export class IncentiveController {
  constructor(private readonly service: IncentiveService) {}

  @Get()
  @UseGuards(PermissionGuard) @Permission('hr')
  @ApiOperation({ summary: 'Organization incentives list' })
  @ApiOkResponse({ type: IncentiveListResponseDto })
  async findAll(@Query() query: QueryIncentiveDto) {
    return this.service.findAll(query);
  }
}
