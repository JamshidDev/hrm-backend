// Work duration + terminal logs controller.
// Laravel routes:
//   GET /work-duration                          → WorkDurationController::index
//   GET /work-duration/logs                     → WorkDurationController::logs
//   GET /terminal-logs                          → TerminalLogController::index
//   GET /terminal-logs/export                   → TerminalLogController::export

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { WorkDurationService } from '@/modules/turnstile/work-duration/work-duration.service';

@ApiTags('Turnstile / Work Duration')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile')
export class WorkDurationController {
  constructor(private readonly service: WorkDurationService) {}

  @Get('work-duration')
  @ApiOperation({ summary: 'Paginated terminal logs (work duration list)' })
  async index(@Query() q: any) {
    return buildSuccess(true, await this.service.list(q));
  }

  @Get('work-duration/logs')
  @ApiOperation({ summary: 'Worker logs for a specific date' })
  async logs(@Query() q: any) {
    return buildSuccess(true, await this.service.logsForWorker(q));
  }

  @Get('terminal-logs')
  @ApiOperation({ summary: 'Terminal logs (same shape as work-duration)' })
  async terminalLogs(@Query() q: any) {
    return buildSuccess(true, await this.service.terminalLogs(q));
  }

  @Get('terminal-logs/export')
  @ApiOperation({ summary: 'Export terminal logs to Excel (stub url)' })
  async terminalLogsExport() {
    return buildSuccess(true, this.service.terminalLogsExport());
  }
}
