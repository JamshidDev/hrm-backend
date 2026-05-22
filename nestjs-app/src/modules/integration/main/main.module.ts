import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationMainController } from '@/modules/integration/main/main.controller';
import { IntegrationMainService } from '@/modules/integration/main/main.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationMainController],
  providers: [IntegrationMainService],
})
export class IntegrationMainModule {}
