import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerPhoneController } from '@/modules/hr/worker-phones/worker-phone.controller';
import { WorkerPhoneService } from '@/modules/hr/worker-phones/worker-phone.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule],
  controllers: [WorkerPhoneController],
  providers: [WorkerPhoneService, WorkerUuidLookup],
})
export class WorkerPhoneModule {}
