import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ScheduleGroupController } from '@/modules/turnstile/schedule-groups/schedule-group.controller';
import { ScheduleGroupService } from '@/modules/turnstile/schedule-groups/schedule-group.service';

@Module({
  imports: [AuthModule],
  controllers: [ScheduleGroupController],
  providers: [ScheduleGroupService],
})
export class ScheduleGroupModule {}
