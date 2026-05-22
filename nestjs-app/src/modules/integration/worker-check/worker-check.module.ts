import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationWorkerCheckController } from '@/modules/integration/worker-check/worker-check.controller';
import { IntegrationWorkerCheckService } from '@/modules/integration/worker-check/worker-check.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationWorkerCheckController],
  providers: [IntegrationWorkerCheckService],
})
export class IntegrationWorkerCheckModule {}
