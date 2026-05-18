import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ScheduleTypeController } from '@/modules/turnstile/schedule-types/schedule-type.controller';
import { ScheduleTypeService } from '@/modules/turnstile/schedule-types/schedule-type.service';

@Module({
  imports: [AuthModule],
  controllers: [ScheduleTypeController],
  providers: [ScheduleTypeService],
})
export class ScheduleTypeModule {}
