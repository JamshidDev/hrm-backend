import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatTelegramController } from '@/modules/chat/telegram/telegram.controller';
import { ChatTelegramService } from '@/modules/chat/telegram/telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatTelegramController],
  providers: [ChatTelegramService],
})
export class ChatTelegramModule {}
