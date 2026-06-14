import { Module } from '@nestjs/common';
import { TelegramBotController } from '@/modules/telegram-bot/telegram-bot.controller';
import { TelegramBotService } from '@/modules/telegram-bot/telegram-bot.service';
import { TelegramBotGuard } from '@/common/guards/telegram-bot.guard';

@Module({
  controllers: [TelegramBotController],
  providers: [TelegramBotService, TelegramBotGuard],
})
export class TelegramBotModule {}
