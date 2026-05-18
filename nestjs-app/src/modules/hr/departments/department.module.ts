import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DepartmentController } from '@/modules/hr/departments/department.controller';
import { DepartmentService } from '@/modules/hr/departments/department.service';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
})
export class DepartmentModule {}
