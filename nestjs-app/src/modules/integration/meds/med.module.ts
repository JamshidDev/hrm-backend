import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationMedController } from '@/modules/integration/meds/med.controller';
import { IntegrationMedService } from '@/modules/integration/meds/med.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationMedController],
  providers: [IntegrationMedService],
})
export class IntegrationMedModule {}
