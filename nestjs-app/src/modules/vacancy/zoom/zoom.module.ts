import { Module } from '@nestjs/common';
import { VacancyZoomController } from '@/modules/vacancy/zoom/zoom.controller';

@Module({
  controllers: [VacancyZoomController],
})
export class VacancyZoomModule {}
