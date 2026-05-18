import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ResultController } from '@/modules/exam/results/result.controller';
import { ResultService } from '@/modules/exam/results/result.service';

@Module({
  imports: [AuthModule],
  controllers: [ResultController],
  providers: [ResultService],
  exports: [ResultService],
})
export class ResultModule {}
