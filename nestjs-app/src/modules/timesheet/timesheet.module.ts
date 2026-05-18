// TimeSheet aggregator module. Laravel: Modules/TimeSheet.
// Birlashtirilgan sub-modullar.

import { Module } from '@nestjs/common';
import { TimeSheetModule } from '@/modules/timesheet/timesheet/timesheet.module';
import { TimeSheetWorkerModule } from '@/modules/timesheet/timesheet-workers/timesheet-worker.module';
import { TimeSheetWorkerDepartmentModule } from '@/modules/timesheet/timesheet-worker-departments/timesheet-worker-department.module';
import { TimeSheetEnumsDepartmentsModule } from '@/modules/timesheet/timesheet-enums-departments/timesheet-enums-departments.module';
import { TimesheetConfirmationModule } from '@/modules/timesheet/timesheet-confirmations/timesheet-confirmation.module';

@Module({
  imports: [
    TimeSheetModule,
    TimeSheetWorkerModule,
    TimeSheetWorkerDepartmentModule,
    TimeSheetEnumsDepartmentsModule,
    TimesheetConfirmationModule,
  ],
})
export class TimesheetAggregatorModule {}
