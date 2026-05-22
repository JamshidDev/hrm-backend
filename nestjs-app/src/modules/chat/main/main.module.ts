import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatMainController } from '@/modules/chat/main/main.controller';
import { ChatMainService } from '@/modules/chat/main/main.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatMainController],
  providers: [ChatMainService],
})
export class ChatMainModule {}
