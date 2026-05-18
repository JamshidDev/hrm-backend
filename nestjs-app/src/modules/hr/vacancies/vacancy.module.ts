import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { VacancyController } from '@/modules/hr/vacancies/vacancy.controller';
import { VacancyService } from '@/modules/hr/vacancies/vacancy.service';

@Module({
  imports: [AuthModule],
  controllers: [VacancyController],
  providers: [VacancyService],
})
export class VacancyModule {}
