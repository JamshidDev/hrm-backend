import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { WorkerCategoryController } from '@/modules/economist/worker-categories/worker-category.controller';
import { WorkerCategoryService } from '@/modules/economist/worker-categories/worker-category.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkerCategoryController],
  providers: [WorkerCategoryService],
})
export class WorkerCategoryModule {}
