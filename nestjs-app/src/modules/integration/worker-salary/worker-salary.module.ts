import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationWorkerSalaryController } from '@/modules/integration/worker-salary/worker-salary.controller';
import { IntegrationWorkerSalaryService } from '@/modules/integration/worker-salary/worker-salary.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationWorkerSalaryController],
  providers: [IntegrationWorkerSalaryService],
})
export class IntegrationWorkerSalaryModule {}
