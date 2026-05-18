import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { TimeSheetWorkerController } from '@/modules/timesheet/timesheet-workers/timesheet-worker.controller';
import { TimeSheetWorkerService } from '@/modules/timesheet/timesheet-workers/timesheet-worker.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [TimeSheetWorkerController],
  providers: [TimeSheetWorkerService],
})
export class TimeSheetWorkerModule {}
