import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerRelativeDisabilityController } from '@/modules/hr/worker-relative-disabilities/worker-relative-disability.controller';
import { WorkerRelativeDisabilityService } from '@/modules/hr/worker-relative-disabilities/worker-relative-disability.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkerRelativeDisabilityController],
  providers: [WorkerRelativeDisabilityService],
})
export class WorkerRelativeDisabilityModule {}
