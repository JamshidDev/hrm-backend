import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { DashboardViewsController } from '@/modules/hr/dashboard-views/dashboard-views.controller';
import { DashboardViewsService } from '@/modules/hr/dashboard-views/dashboard-views.service';
import { DashboardViewsMapper } from '@/modules/hr/dashboard-views/dashboard-views.mapper';
import { DashboardWorkerService } from '@/modules/hr/dashboard-views/dashboard-worker.service';
import { DashboardHealthService } from '@/modules/hr/dashboard-views/dashboard-health.service';
import { DashboardActivityService } from '@/modules/hr/dashboard-views/dashboard-activity.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [DashboardViewsController],
  providers: [
    DashboardViewsService,
    DashboardViewsMapper,
    DashboardWorkerService,
    DashboardHealthService,
    DashboardActivityService,
  ],
})
export class DashboardViewsModule {}
