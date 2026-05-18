import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { TimesheetConfirmationController } from '@/modules/timesheet/timesheet-confirmations/timesheet-confirmation.controller';
import { TimesheetConfirmationService } from '@/modules/timesheet/timesheet-confirmations/timesheet-confirmation.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [TimesheetConfirmationController],
  providers: [TimesheetConfirmationService],
})
export class TimesheetConfirmationModule {}
