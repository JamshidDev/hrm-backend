import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { IncentiveController } from '@/modules/hr/incentives/incentive.controller';
import { IncentiveService } from '@/modules/hr/incentives/incentive.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [IncentiveController],
  providers: [IncentiveService],
})
export class IncentiveModule {}
