// Schedule stats controller. Laravel: TurnstileScheduleStatsController +
// DashboardPreviewController. Auth middleware: auth.hybrid (mounted under
// /v1/turnstile/schedule prefix).

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { RawResponse } from '@/common/decorators/raw-response.decorator';
import { buildSuccess } from '@/common/utils/response.util';
import {
  ScheduleStatsService,
  StatsQuery,
} from '@/modules/turnstile/schedule-stats/schedule-stats.service';

@ApiTags('Turnstile / Schedule Stats')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/schedule')
export class ScheduleStatsController {
  constructor(private readonly service: ScheduleStatsService) {}

  @Get('stats-one')
  @ApiOperation({ summary: 'Total/scheduled/attended/absent workers (today)' })
  async statsOne(@Query() q: StatsQuery) {
    return buildSuccess(true, await this.service.statsForTurnstile(q));
  }

  @Get('stats-two')
  @ApiOperation({
    summary: 'Workers without a schedule (current month preview)',
  })
  async statsTwo(@Query() q: StatsQuery) {
    return buildSuccess(true, await this.service.scheduleStatsByMonth(q));
  }

  // Laravel returns shape `{ success, data }` directly (no Helper wrapper).
  // @RawResponse() — ResponseInterceptor o'ramaydi.
  @Get('stats-three')
  @RawResponse()
  @ApiOperation({ summary: 'Current in/out workers + top 3 in/out (today)' })
  async statsThree(@Query() q: StatsQuery) {
    return { success: true, data: await this.service.statsCurrentEvents(q) };
  }

  @Get('stats-four')
  @ApiOperation({ summary: 'Daily attendance chart + devices + auth types' })
  async statsFour(@Query() q: StatsQuery) {
    return buildSuccess(true, await this.service.dailyAttendanceChart(q));
  }

  @Get('stats-five')
  @ApiOperation({ summary: 'Devices counts (all/online/offline)' })
  async statsFive() {
    return buildSuccess(true, await this.service.statsDevices());
  }

  @Get('stats-six')
  @ApiOperation({ summary: 'Privilege turnstile counts' })
  async statsSix(@Query() q: StatsQuery) {
    return buildSuccess(true, await this.service.privilegeTurnstile(q));
  }

  @Get('stats-seven')
  @ApiOperation({ summary: 'Late & early workers grouped by last 3 days' })
  async statsSeven(@Query() q: StatsQuery) {
    return buildSuccess(
      true,
      await this.service.lateAndEarlyStatsGroupedByDays(q),
    );
  }

  @Get('stats-preview')
  @ApiOperation({ summary: 'Dashboard preview — dispatched by `type` param' })
  async statsPreview(@Query() q: Record<string, string>) {
    return buildSuccess(true, await this.service.preview(q));
  }
}
