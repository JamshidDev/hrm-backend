import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  ConfirmationDashboardController,
  ConfirmationDashboardService,
} from '@/modules/confirmation/dashboard/dashboard.controller';

@Module({
  imports: [AuthModule],
  controllers: [ConfirmationDashboardController],
  providers: [ConfirmationDashboardService],
})
export class ConfirmationDashboardModule {}
