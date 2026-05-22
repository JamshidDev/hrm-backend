import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsEduPlanController } from '@/modules/lms/edu-plans/edu-plan.controller';
import { LmsEduPlanService } from '@/modules/lms/edu-plans/edu-plan.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsEduPlanController],
  providers: [LmsEduPlanService],
})
export class LmsEduPlanModule {}
