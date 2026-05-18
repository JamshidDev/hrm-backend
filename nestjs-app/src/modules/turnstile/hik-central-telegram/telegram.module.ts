import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TelegramController } from '@/modules/turnstile/hik-central-telegram/telegram.controller';
import { TelegramService } from '@/modules/turnstile/hik-central-telegram/telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
