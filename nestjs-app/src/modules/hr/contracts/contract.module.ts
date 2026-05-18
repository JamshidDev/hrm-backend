import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ContractController } from '@/modules/hr/contracts/contract.controller';
import { ContractService } from '@/modules/hr/contracts/contract.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [ContractController],
  providers: [ContractService],
})
export class ContractModule {}
