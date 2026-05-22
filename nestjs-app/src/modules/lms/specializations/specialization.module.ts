import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsSpecializationController } from '@/modules/lms/specializations/specialization.controller';
import { LmsSpecializationService } from '@/modules/lms/specializations/specialization.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsSpecializationController],
  providers: [LmsSpecializationService],
})
export class LmsSpecializationModule {}
