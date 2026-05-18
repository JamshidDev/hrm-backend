import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { DashboardController } from '@/modules/hr/dashboard/dashboard.controller';
import { DashboardService } from '@/modules/hr/dashboard/dashboard.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
