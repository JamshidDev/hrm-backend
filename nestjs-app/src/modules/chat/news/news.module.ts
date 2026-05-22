import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  ChatNewsAdminController,
  ChatNewsPublicController,
} from '@/modules/chat/news/news.controller';
import { ChatNewsService } from '@/modules/chat/news/news.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatNewsAdminController, ChatNewsPublicController],
  providers: [ChatNewsService],
  exports: [ChatNewsService],
})
export class ChatNewsModule {}
