import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  HrZoomController,
  VacancyPositionController,
} from '@/modules/hr/vacancy-positions/vacancy-position.controller';
import { VacancyPositionService } from '@/modules/hr/vacancy-positions/vacancy-position.service';

@Module({
  imports: [AuthModule],
  controllers: [VacancyPositionController, HrZoomController],
  providers: [VacancyPositionService],
})
export class VacancyPositionModule {}
