import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerDisabilityController } from '@/modules/hr/worker-disabilities/worker-disability.controller';
import { WorkerDisabilityService } from '@/modules/hr/worker-disabilities/worker-disability.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule],
  controllers: [WorkerDisabilityController],
  providers: [WorkerDisabilityService, WorkerUuidLookup],
})
export class WorkerDisabilityModule {}
