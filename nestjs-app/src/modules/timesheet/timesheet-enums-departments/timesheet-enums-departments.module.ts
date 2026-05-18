import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TimeSheetEnumsDepartmentsController } from '@/modules/timesheet/timesheet-enums-departments/timesheet-enums-departments.controller';
import { TimeSheetEnumsDepartmentsService } from '@/modules/timesheet/timesheet-enums-departments/timesheet-enums-departments.service';

@Module({
  imports: [AuthModule],
  controllers: [TimeSheetEnumsDepartmentsController],
  providers: [TimeSheetEnumsDepartmentsService],
})
export class TimeSheetEnumsDepartmentsModule {}
