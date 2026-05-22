import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatNewsMediaController } from '@/modules/chat/news-media/news-media.controller';
import { ChatNewsMediaService } from '@/modules/chat/news-media/news-media.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatNewsMediaController],
  providers: [ChatNewsMediaService],
})
export class ChatNewsMediaModule {}
