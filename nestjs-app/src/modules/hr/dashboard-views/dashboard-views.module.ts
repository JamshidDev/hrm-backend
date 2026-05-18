import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { DashboardViewsController } from '@/modules/hr/dashboard-views/dashboard-views.controller';
import { DashboardViewsService } from '@/modules/hr/dashboard-views/dashboard-views.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [DashboardViewsController],
  providers: [DashboardViewsService],
})
export class DashboardViewsModule {}
