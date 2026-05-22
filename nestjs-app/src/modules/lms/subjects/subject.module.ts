import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsSubjectController } from '@/modules/lms/subjects/subject.controller';
import { LmsSubjectService } from '@/modules/lms/subjects/subject.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsSubjectController],
  providers: [LmsSubjectService],
})
export class LmsSubjectModule {}
