// Public exam-result modul — auth talab qilmaydigan UUID natija lookup.
// ResultService'ni qayta ishlatadi (ResultModule eksport qiladi).

import { Module } from '@nestjs/common';
import { ResultModule } from '@/modules/exam/results/result.module';
import { PublicExamResultController } from '@/modules/exam/public-exam-results/public-exam-result.controller';

@Module({
  imports: [ResultModule],
  controllers: [PublicExamResultController],
})
export class PublicExamResultModule {}
