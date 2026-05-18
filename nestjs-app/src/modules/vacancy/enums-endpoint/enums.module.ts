import { Module } from '@nestjs/common';
import { VacancyEnumsController } from '@/modules/vacancy/enums-endpoint/enums.controller';
import { VacancyEnumsService } from '@/modules/vacancy/enums-endpoint/enums.service';

@Module({
  controllers: [VacancyEnumsController],
  providers: [VacancyEnumsService],
})
export class VacancyEnumsModule {}
