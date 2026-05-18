import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { EduPlanController } from '@/modules/hr/edu-plans/edu-plan.controller';
import { EduPlanService } from '@/modules/hr/edu-plans/edu-plan.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [EduPlanController],
  providers: [EduPlanService],
})
export class EduPlanModule {}
