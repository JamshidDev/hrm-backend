import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatNewsEngagementController } from '@/modules/chat/news-engagement/engagement.controller';
import { ChatNewsEngagementService } from '@/modules/chat/news-engagement/engagement.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatNewsEngagementController],
  providers: [ChatNewsEngagementService],
})
export class ChatNewsEngagementModule {}
