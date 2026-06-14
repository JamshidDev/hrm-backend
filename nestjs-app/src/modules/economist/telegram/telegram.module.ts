import { Module } from '@nestjs/common';
import { EconomistTelegramController } from '@/modules/economist/telegram/telegram.controller';
import { EconomistTelegramService } from '@/modules/economist/telegram/telegram.service';
import { EconomistTelegramGuard } from '@/common/guards/economist-telegram.guard';

@Module({
  controllers: [EconomistTelegramController],
  providers: [EconomistTelegramService, EconomistTelegramGuard],
})
export class EconomistTelegramModule {}
