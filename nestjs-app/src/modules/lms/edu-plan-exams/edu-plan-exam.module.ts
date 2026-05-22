import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsEduPlanExamController } from '@/modules/lms/edu-plan-exams/edu-plan-exam.controller';
import { LmsEduPlanExamService } from '@/modules/lms/edu-plan-exams/edu-plan-exam.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsEduPlanExamController],
  providers: [LmsEduPlanExamService],
})
export class LmsEduPlanExamModule {}
