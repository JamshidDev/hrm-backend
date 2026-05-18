import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ContractAdditionalController } from '@/modules/hr/contract-additional/contract-additional.controller';
import { ContractAdditionalService } from '@/modules/hr/contract-additional/contract-additional.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [ContractAdditionalController],
  providers: [ContractAdditionalService],
})
export class ContractAdditionalModule {}
