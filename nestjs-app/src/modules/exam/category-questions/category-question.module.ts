import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { CategoryQuestionController } from '@/modules/exam/category-questions/category-question.controller';
import { CategoryQuestionService } from '@/modules/exam/category-questions/category-question.service';

@Module({
  imports: [AuthModule],
  controllers: [CategoryQuestionController],
  providers: [CategoryQuestionService],
})
export class CategoryQuestionModule {}
