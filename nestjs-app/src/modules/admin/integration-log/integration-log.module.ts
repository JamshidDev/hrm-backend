import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationLogController } from '@/modules/admin/integration-log/integration-log.controller';
import { IntegrationLogService } from '@/modules/admin/integration-log/integration-log.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationLogController],
  providers: [IntegrationLogService],
})
export class IntegrationLogModule {}
