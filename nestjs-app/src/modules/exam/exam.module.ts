// Exam aggregator module. Laravel: Modules/Exam (~34 route).
//
// Sub-modullar:
//   - TopicModule              (/api/v1/exam/topics + filter)
//   - TopicFileModule          (/api/v1/exam/topics/{id}/files)
//   - TopicExamModule          (/api/v1/exam/topics/{id}/exams + filter + solved-workers + attach-question)
//   - TopicExtrasModule        (/api/v1/exam/topics/{id}/positions, /workers)
//   - CategoryModule           (/api/v1/exam/categories + clear + excel-header + import)
//   - CategoryQuestionModule   (/api/v1/exam/categories/{id}/questions)
//   - WorkerExamModule         (/api/v1/exam/worker-exams + statistics + start/continue/finish)
//   - ExamVideoModule          (/api/v1/exam/worker-exams/{start,finish}-video + worker-exam-videos)
//   - ResultModule             (/api/v1/exam/results + send-confirmations + export)
//   - ExamEnumsModule          (/api/v1/exam/enums)
//   - PublicExamResultModule   (/api/v1/documents/exams/{uuid}) — auth talab qilmaydi.

import { Module } from '@nestjs/common';

import { TopicModule } from '@/modules/exam/topics/topic.module';
import { TopicFileModule } from '@/modules/exam/topic-files/topic-file.module';
import { TopicExamModule } from '@/modules/exam/topic-exams/topic-exam.module';
import { TopicExtrasModule } from '@/modules/exam/topic-extras/topic-extras.module';
import { CategoryModule } from '@/modules/exam/categories/category.module';
import { CategoryQuestionModule } from '@/modules/exam/category-questions/category-question.module';
import { WorkerExamModule } from '@/modules/exam/worker-exams/worker-exam.module';
import { ExamVideoModule } from '@/modules/exam/exam-videos/exam-video.module';
import { ResultModule } from '@/modules/exam/results/result.module';
import { ExamEnumsModule } from '@/modules/exam/enums-endpoint/enums.module';
import { PublicExamResultModule } from '@/modules/exam/public-exam-results/public-exam-result.module';

@Module({
  imports: [
    TopicModule,
    TopicFileModule,
    TopicExamModule,
    TopicExtrasModule,
    CategoryModule,
    CategoryQuestionModule,
    WorkerExamModule,
    ExamVideoModule,
    ResultModule,
    ExamEnumsModule,
    PublicExamResultModule,
  ],
})
export class ExamModule {}
