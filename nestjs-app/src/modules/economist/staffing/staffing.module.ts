import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StaffingController } from '@/modules/economist/staffing/staffing.controller';
import { StaffingService } from '@/modules/economist/staffing/staffing.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffingController],
  providers: [StaffingService],
})
export class StaffingModule {}
