import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DashboardController } from '@/modules/economist/dashboard/dashboard.controller';
import { DashboardService } from '@/modules/economist/dashboard/dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class EconomistDashboardModule {}
