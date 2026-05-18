import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ExamEnumsController } from '@/modules/exam/enums-endpoint/enums.controller';

@Module({
  imports: [AuthModule],
  controllers: [ExamEnumsController],
})
export class ExamEnumsModule {}
