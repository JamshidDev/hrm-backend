import { Module } from '@nestjs/common';
import { VacancyBoardController } from '@/modules/vacancy/vacancy-board/vacancy-board.controller';
import { VacancyBoardService } from '@/modules/vacancy/vacancy-board/vacancy-board.service';

@Module({
  controllers: [VacancyBoardController],
  providers: [VacancyBoardService],
})
export class VacancyBoardModule {}
