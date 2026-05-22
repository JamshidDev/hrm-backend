import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { AdminTelegramController } from '@/modules/admin/telegram/telegram.controller';
import { AdminTelegramService } from '@/modules/admin/telegram/telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminTelegramController],
  providers: [AdminTelegramService],
})
export class AdminTelegramModule {}
