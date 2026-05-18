import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ScheduleController } from '@/modules/structure/schedules/schedule.controller';
import { ScheduleService } from '@/modules/structure/schedules/schedule.service';

@Module({
  imports: [AuthModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
