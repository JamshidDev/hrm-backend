import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  VacationScheduleYearController,
  VacationScheduleYearWorkersController,
} from '@/modules/hr/vacation-schedule-years/vacation-schedule-year.controller';
import { VacationScheduleYearService } from '@/modules/hr/vacation-schedule-years/vacation-schedule-year.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [
    VacationScheduleYearController,
    VacationScheduleYearWorkersController,
  ],
  providers: [VacationScheduleYearService],
})
export class VacationScheduleYearModule {}
