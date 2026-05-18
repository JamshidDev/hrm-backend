import { Module } from '@nestjs/common';
import { EconomistTelegramController } from '@/modules/economist/telegram/telegram.controller';
import { EconomistTelegramService } from '@/modules/economist/telegram/telegram.service';

@Module({
  controllers: [EconomistTelegramController],
  providers: [EconomistTelegramService],
})
export class EconomistTelegramModule {}
