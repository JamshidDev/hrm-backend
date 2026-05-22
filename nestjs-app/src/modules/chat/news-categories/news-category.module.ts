import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ChatNewsCategoryController } from '@/modules/chat/news-categories/news-category.controller';
import { ChatNewsCategoryService } from '@/modules/chat/news-categories/news-category.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatNewsCategoryController],
  providers: [ChatNewsCategoryService],
})
export class ChatNewsCategoryModule {}
