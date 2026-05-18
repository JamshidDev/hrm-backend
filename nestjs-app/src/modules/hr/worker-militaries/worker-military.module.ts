import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerMilitaryController } from '@/modules/hr/worker-militaries/worker-military.controller';
import { WorkerMilitaryService } from '@/modules/hr/worker-militaries/worker-military.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule],
  controllers: [WorkerMilitaryController],
  providers: [WorkerMilitaryService, WorkerUuidLookup],
})
export class WorkerMilitaryModule {}
