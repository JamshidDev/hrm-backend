import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerSickLeaveController } from '@/modules/hr/worker-sick-leaves/worker-sick-leave.controller';
import { WorkerSickLeaveService } from '@/modules/hr/worker-sick-leaves/worker-sick-leave.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule],
  controllers: [WorkerSickLeaveController],
  providers: [WorkerSickLeaveService, WorkerUuidLookup],
})
export class WorkerSickLeaveModule {}
