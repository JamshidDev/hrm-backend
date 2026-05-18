import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EducationController } from '@/modules/vacancy/educations/education.controller';
import { EducationService } from '@/modules/vacancy/educations/education.service';

@Module({
  imports: [AuthModule],
  controllers: [EducationController],
  providers: [EducationService],
})
export class EducationModule {}
