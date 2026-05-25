// Turnstile enums controller. Laravel: TurnstileController->enums.

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthHybridGuard } from '@/common/guards/auth-hybrid.guard';
import { buildSuccess } from '@/common/utils/response.util';
import { scheduleTypeList } from '@/modules/turnstile/_shared/helpers';

// Laravel returns 5 time-blocks (Smena schedule).
const TIMES = [
  {
    start_time: '00:00',
    end_time: '08:00',
    daily_minutes: 480,
    daytime: 120,
    evening_time: 360,
  },
  {
    start_time: '08:00',
    end_time: '20:00',
    daily_minutes: 720,
    daytime: 720,
    evening_time: 0,
  },
  {
    start_time: '20:00',
    end_time: '00:00',
    daily_minutes: 240,
    daytime: 120,
    evening_time: 120,
  },
  {
    start_time: '00:00',
    end_time: '08:00',
    daily_minutes: 420,
    daytime: 120,
    evening_time: 300,
  },
  {
    start_time: '08:00',
    end_time: '20:00',
    daily_minutes: 660,
    daytime: 660,
    evening_time: 0,
  },
];

@ApiTags('Turnstile / Enums')
@ApiBearerAuth('access-token')
@UseGuards(AuthHybridGuard)
@Controller('api/v1/turnstile/enums')
export class TurnstileEnumsController {
  @Get()
  @ApiOperation({ summary: 'Schedule types + work-time blocks' })
  enums() {
    // Laravel: ScheduleTypeEnum::list() — 5 entries.
    return buildSuccess(true, {
      schedule_types: scheduleTypeList(),
      times: TIMES,
    });
  }
}
