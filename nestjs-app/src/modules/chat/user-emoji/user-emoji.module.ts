import { Module } from '@nestjs/common';
import { ChatUserEmojiController } from '@/modules/chat/user-emoji/user-emoji.controller';
import { ChatUserEmojiService } from '@/modules/chat/user-emoji/user-emoji.service';

@Module({
  controllers: [ChatUserEmojiController],
  providers: [ChatUserEmojiService],
})
export class ChatUserEmojiModule {}
