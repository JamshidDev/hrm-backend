import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { TimeSheetController } from '@/modules/timesheet/timesheet/timesheet.controller';
import { TimeSheetService } from '@/modules/timesheet/timesheet/timesheet.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [TimeSheetController],
  providers: [TimeSheetService],
})
export class TimeSheetModule {}
