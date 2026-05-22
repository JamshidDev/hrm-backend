// Chat module aggregator. Laravel: Modules/Chat.
// 9 ta sub-modul:
//   - main: GET /chat/enums
//   - news-categories: /chat/categories CRUD
//   - news: /chat/news CRUD + /news (public list)
//   - news-translations: /chat/translations CRUD
//   - news-media: /chat/media (multipart upload + list/show/delete)
//   - news-engagement: POST /news/:id/view, /news/:id/reaction (auth.hybrid)
//   - notifications: /notifications + /enums + /send + /send-batch
//   - telegram: /telegram/messages, /telegram/dashboard
//   - user-emoji: POST /chat/emoji (Laravel: socket-server-api middleware)

import { Module } from '@nestjs/common';
import { ChatMainModule } from '@/modules/chat/main/main.module';
import { ChatNewsCategoryModule } from '@/modules/chat/news-categories/news-category.module';
import { ChatNewsModule } from '@/modules/chat/news/news.module';
import { ChatNewsTranslationModule } from '@/modules/chat/news-translations/news-translation.module';
import { ChatNewsMediaModule } from '@/modules/chat/news-media/news-media.module';
import { ChatNewsEngagementModule } from '@/modules/chat/news-engagement/engagement.module';
import { ChatNotificationModule } from '@/modules/chat/notifications/notification.module';
import { ChatTelegramModule } from '@/modules/chat/telegram/telegram.module';
import { ChatUserEmojiModule } from '@/modules/chat/user-emoji/user-emoji.module';

@Module({
  imports: [
    ChatMainModule,
    ChatNewsCategoryModule,
    ChatNewsModule,
    ChatNewsTranslationModule,
    ChatNewsMediaModule,
    ChatNewsEngagementModule,
    ChatNotificationModule,
    ChatTelegramModule,
    ChatUserEmojiModule,
  ],
})
export class ChatModule {}
