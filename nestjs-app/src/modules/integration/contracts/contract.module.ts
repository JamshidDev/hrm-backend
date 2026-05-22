import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationContractController } from '@/modules/integration/contracts/contract.controller';
import { IntegrationContractService } from '@/modules/integration/contracts/contract.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationContractController],
  providers: [IntegrationContractService],
})
export class IntegrationContractModule {}
