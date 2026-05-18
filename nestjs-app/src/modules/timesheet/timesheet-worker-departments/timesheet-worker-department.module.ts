import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { TimeSheetWorkerDepartmentController } from '@/modules/timesheet/timesheet-worker-departments/timesheet-worker-department.controller';
import { TimeSheetWorkerDepartmentService } from '@/modules/timesheet/timesheet-worker-departments/timesheet-worker-department.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [TimeSheetWorkerDepartmentController],
  providers: [TimeSheetWorkerDepartmentService],
})
export class TimeSheetWorkerDepartmentModule {}
