import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ActivityLogController } from '@/modules/admin/activity-logs/activity-log.controller';
import { ActivityLogService } from '@/modules/admin/activity-logs/activity-log.service';

@Module({
  imports: [AuthModule],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
})
export class ActivityLogModule {}
