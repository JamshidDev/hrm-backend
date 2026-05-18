import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkDurationController } from '@/modules/turnstile/work-duration/work-duration.controller';
import { WorkDurationService } from '@/modules/turnstile/work-duration/work-duration.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkDurationController],
  providers: [WorkDurationService],
})
export class WorkDurationModule {}
