// TimeSheet enums + departments controller. Laravel: TimeSheetController::enums/departments.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TimeSheetEnumsDepartmentsService } from '@/modules/timesheet/timesheet-enums-departments/timesheet-enums-departments.service';

@ApiTags('TimeSheet / Enums & Departments')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/timesheet')
export class TimeSheetEnumsDepartmentsController {
  constructor(private readonly service: TimeSheetEnumsDepartmentsService) {}

  @Get('enums')
  @ApiOperation({ summary: 'TimeSheet type enums (25 types)' })
  enums() {
    return buildSuccess(true, this.service.enums());
  }

  @Get('departments')
  @ApiOperation({
    summary: 'User worker time-sheet departments + organizations',
  })
  async departments() {
    return buildSuccess(true, await this.service.departments());
  }
}
