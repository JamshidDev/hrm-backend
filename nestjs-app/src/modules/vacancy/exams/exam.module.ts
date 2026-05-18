import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { VacancyExamController } from '@/modules/vacancy/exams/exam.controller';
import { VacancyExamService } from '@/modules/vacancy/exams/exam.service';

@Module({
  imports: [AuthModule],
  controllers: [VacancyExamController],
  providers: [VacancyExamService],
})
export class VacancyExamModule {}
