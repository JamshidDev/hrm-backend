// HR enums controller. Laravel: HRController::enums()
//
// Route: GET /api/v1/hr/enums

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { HrEnumsService } from '@/modules/hr/enums-endpoint/enums.service';

@ApiTags('HR / Enums')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/hr')
export class HrEnumsController {
  constructor(private readonly service: HrEnumsService) {}

  @Get('enums')
  @ApiOperation({ summary: 'HR enums aggregate (29 lists)' })
  async list() {
    const data = await this.service.list();
    return buildSuccess(true, data);
  }
}
