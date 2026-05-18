import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerExamController } from '@/modules/exam/worker-exams/worker-exam.controller';
import { WorkerExamService } from '@/modules/exam/worker-exams/worker-exam.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkerExamController],
  providers: [WorkerExamService],
})
export class WorkerExamModule {}
