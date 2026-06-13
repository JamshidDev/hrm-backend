// Integration worker salary controller.

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { Permission } from '@/common/decorators/permission.decorator';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { IntegrationWorkerSalaryService } from '@/modules/integration/worker-salary/worker-salary.service';
import {
  WorkerSalaryDto,
  WorkerSalaryMonthsDto,
} from '@/modules/integration/worker-salary/dto/worker-salary.dto';

@ApiTags('Integration / Worker Salary')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard, PermissionGuard)
@Permission('integration|integration-worker-salary')
@Controller('api/v1/integration/worker')
export class IntegrationWorkerSalaryController {
  constructor(private readonly service: IntegrationWorkerSalaryService) {}

  // Laravel response()->json(['salary' => ...]) — FLAT.
  @Post('salary')
  @RawResponse()
  @ApiOperation({ summary: 'Worker salary statements' })
  async getStatements(@Body() dto: WorkerSalaryDto) {
    return this.service.getStatements(dto);
  }

  // Laravel response()->json(['months' => ...]) — FLAT (Helper::response'siz).
  @Post('get-salary-months')
  @RawResponse()
  @ApiOperation({ summary: 'Worker salary months' })
  async getStatementMonths(@Body() dto: WorkerSalaryMonthsDto) {
    return this.service.getStatementMonths(dto);
  }
}
