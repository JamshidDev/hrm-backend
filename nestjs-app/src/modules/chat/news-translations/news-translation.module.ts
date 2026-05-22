import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatNewsTranslationController } from '@/modules/chat/news-translations/news-translation.controller';
import { ChatNewsTranslationService } from '@/modules/chat/news-translations/news-translation.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatNewsTranslationController],
  providers: [ChatNewsTranslationService],
})
export class ChatNewsTranslationModule {}
