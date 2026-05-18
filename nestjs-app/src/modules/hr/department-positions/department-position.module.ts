import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { DepartmentPositionController } from '@/modules/hr/department-positions/department-position.controller';
import { DepartmentPositionService } from '@/modules/hr/department-positions/department-position.service';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentPositionController],
  providers: [DepartmentPositionService],
})
export class DepartmentPositionModule {}
