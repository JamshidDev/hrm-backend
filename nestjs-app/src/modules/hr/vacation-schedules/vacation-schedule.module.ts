import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  VacationScheduleController,
  VacationSchedulesExtrasController,
} from '@/modules/hr/vacation-schedules/vacation-schedule.controller';
import { VacationScheduleService } from '@/modules/hr/vacation-schedules/vacation-schedule.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [VacationScheduleController, VacationSchedulesExtrasController],
  providers: [VacationScheduleService],
})
export class VacationScheduleModule {}
