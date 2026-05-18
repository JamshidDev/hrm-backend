import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LearningCenterController } from '@/modules/structure/learning-centers/learning-center.controller';
import { LearningCenterService } from '@/modules/structure/learning-centers/learning-center.service';

@Module({
  imports: [AuthModule],
  controllers: [LearningCenterController],
  providers: [LearningCenterService],
})
export class LearningCenterModule {}
