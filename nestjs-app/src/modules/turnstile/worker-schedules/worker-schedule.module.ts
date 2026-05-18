import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerScheduleController } from '@/modules/turnstile/worker-schedules/worker-schedule.controller';
import { WorkerScheduleService } from '@/modules/turnstile/worker-schedules/worker-schedule.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkerScheduleController],
  providers: [WorkerScheduleService],
})
export class WorkerScheduleModule {}
