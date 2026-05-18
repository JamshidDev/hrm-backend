import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TopicExtrasController } from '@/modules/exam/topic-extras/topic-extras.controller';
import { TopicExtrasService } from '@/modules/exam/topic-extras/topic-extras.service';

@Module({
  imports: [AuthModule],
  controllers: [TopicExtrasController],
  providers: [TopicExtrasService],
})
export class TopicExtrasModule {}
