import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatNotificationController } from '@/modules/chat/notifications/notification.controller';
import { ChatNotificationService } from '@/modules/chat/notifications/notification.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatNotificationController],
  providers: [ChatNotificationService],
})
export class ChatNotificationModule {}
