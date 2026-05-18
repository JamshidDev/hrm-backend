import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ExamVideoController } from '@/modules/exam/exam-videos/exam-video.controller';
import { ExamVideoService } from '@/modules/exam/exam-videos/exam-video.service';

@Module({
  imports: [AuthModule],
  controllers: [ExamVideoController],
  providers: [ExamVideoService],
})
export class ExamVideoModule {}
