import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  DepartmentLocationController,
  DepartmentLocationListController,
} from '@/modules/hr/department-locations/department-location.controller';
import { DepartmentLocationService } from '@/modules/hr/department-locations/department-location.service';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentLocationController, DepartmentLocationListController],
  providers: [DepartmentLocationService],
})
export class DepartmentLocationModule {}
