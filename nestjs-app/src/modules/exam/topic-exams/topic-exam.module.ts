import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TopicExamController } from '@/modules/exam/topic-exams/topic-exam.controller';
import { TopicExamService } from '@/modules/exam/topic-exams/topic-exam.service';

@Module({
  imports: [AuthModule],
  controllers: [TopicExamController],
  providers: [TopicExamService],
})
export class TopicExamModule {}
