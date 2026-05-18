import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerPartyController } from '@/modules/hr/worker-parties/worker-party.controller';
import { WorkerPartyService } from '@/modules/hr/worker-parties/worker-party.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule],
  controllers: [WorkerPartyController],
  providers: [WorkerPartyService, WorkerUuidLookup],
})
export class WorkerPartyModule {}
