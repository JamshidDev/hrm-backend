import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsLessonController } from '@/modules/lms/lessons/lesson.controller';
import { LmsLessonService } from '@/modules/lms/lessons/lesson.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsLessonController],
  providers: [LmsLessonService],
})
export class LmsLessonModule {}
