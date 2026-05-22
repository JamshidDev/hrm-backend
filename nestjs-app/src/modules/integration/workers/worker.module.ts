import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationWorkerController } from '@/modules/integration/workers/worker.controller';
import { IntegrationWorkerService } from '@/modules/integration/workers/worker.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationWorkerController],
  providers: [IntegrationWorkerService],
})
export class IntegrationWorkerModule {}
