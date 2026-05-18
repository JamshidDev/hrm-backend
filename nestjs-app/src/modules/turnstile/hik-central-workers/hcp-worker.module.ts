import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { HcpWorkerController } from '@/modules/turnstile/hik-central-workers/hcp-worker.controller';
import { HcpWorkerService } from '@/modules/turnstile/hik-central-workers/hcp-worker.service';

@Module({
  imports: [AuthModule],
  controllers: [HcpWorkerController],
  providers: [HcpWorkerService],
})
export class HcpWorkerModule {}
