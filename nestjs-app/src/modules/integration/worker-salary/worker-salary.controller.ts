// Integration worker salary controller.

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { IntegrationWorkerSalaryService } from '@/modules/integration/worker-salary/worker-salary.service';
import {
  WorkerSalaryDto,
  WorkerSalaryMonthsDto,
} from '@/modules/integration/worker-salary/dto/worker-salary.dto';

@ApiTags('Integration / Worker Salary')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/integration/worker')
export class IntegrationWorkerSalaryController {
  constructor(private readonly service: IntegrationWorkerSalaryService) {}

  @Post('salary')
  @ApiOperation({ summary: 'Worker salary statements (stub)' })
  async getStatements(@Body() dto: WorkerSalaryDto) {
    return buildSuccess(true, await this.service.getStatements(dto));
  }

  @Post('get-salary-months')
  @ApiOperation({ summary: 'Worker salary months (stub)' })
  async getStatementMonths(@Body() dto: WorkerSalaryMonthsDto) {
    return buildSuccess(true, await this.service.getStatementMonths(dto));
  }
}
