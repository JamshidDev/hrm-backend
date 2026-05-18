import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TopicController } from '@/modules/exam/topics/topic.controller';
import { TopicService } from '@/modules/exam/topics/topic.service';

@Module({
  imports: [AuthModule],
  controllers: [TopicController],
  providers: [TopicService],
})
export class TopicModule {}
