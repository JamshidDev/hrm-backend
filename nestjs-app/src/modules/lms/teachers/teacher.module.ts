import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LmsTeacherController } from '@/modules/lms/teachers/teacher.controller';
import { LmsTeacherService } from '@/modules/lms/teachers/teacher.service';

@Module({
  imports: [AuthModule],
  controllers: [LmsTeacherController],
  providers: [LmsTeacherService],
})
export class LmsTeacherModule {}
