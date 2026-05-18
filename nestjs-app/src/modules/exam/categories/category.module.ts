import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { CategoryController } from '@/modules/exam/categories/category.controller';
import { CategoryService } from '@/modules/exam/categories/category.service';

@Module({
  imports: [AuthModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
