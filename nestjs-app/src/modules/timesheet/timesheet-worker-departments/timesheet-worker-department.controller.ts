// TimeSheetWorkerDepartment controller. Laravel: TimeSheetWorkerDepartmentController.

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { TimeSheetWorkerDepartmentService } from '@/modules/timesheet/timesheet-worker-departments/timesheet-worker-department.service';
import {
  AttachDto,
  DetachDto,
  QueryTimeSheetWorkerDepartmentDto,
  TimeSheetWorkerDepartmentListResponseDto,
} from '@/modules/timesheet/timesheet-worker-departments/dto/timesheet-worker-department.dto';

@ApiTags('TimeSheet / Worker Departments')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/timesheet/worker-departments')
export class TimeSheetWorkerDepartmentController {
  constructor(
    private readonly service: TimeSheetWorkerDepartmentService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Worker positions assigned to timesheet departments',
  })
  @ApiOkResponse({ type: TimeSheetWorkerDepartmentListResponseDto })
  async findAll(@Query() query: QueryTimeSheetWorkerDepartmentDto) {
    return this.service.findAll(query);
  }

  @Post('attach')
  @ApiOperation({ summary: 'Attach departments to a worker position' })
  async attach(@Body() dto: AttachDto) {
    await this.service.attach(dto);
    return buildSuccess(this.i18n.t('messages.successfully_attached'), []);
  }

  @Post('detach')
  @ApiOperation({ summary: 'Detach departments from a worker position' })
  async detach(@Body() dto: DetachDto) {
    await this.service.detach(dto);
    return buildSuccess(this.i18n.t('messages.successfully_detached'), []);
  }
}
