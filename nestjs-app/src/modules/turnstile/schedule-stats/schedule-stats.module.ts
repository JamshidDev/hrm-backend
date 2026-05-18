import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ScheduleStatsController } from '@/modules/turnstile/schedule-stats/schedule-stats.controller';
import { ScheduleStatsService } from '@/modules/turnstile/schedule-stats/schedule-stats.service';

@Module({
  imports: [AuthModule],
  controllers: [ScheduleStatsController],
  providers: [ScheduleStatsService],
})
export class ScheduleStatsModule {}
