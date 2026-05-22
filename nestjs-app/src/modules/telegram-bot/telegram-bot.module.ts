import { Module } from '@nestjs/common';
import { TelegramBotController } from '@/modules/telegram-bot/telegram-bot.controller';
import { TelegramBotService } from '@/modules/telegram-bot/telegram-bot.service';

@Module({
  controllers: [TelegramBotController],
  providers: [TelegramBotService],
})
export class TelegramBotModule {}
