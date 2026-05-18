import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  WorkerPositionController,
  WorkerPositionExtrasController,
} from '@/modules/hr/worker-positions/worker-position.controller';
import { WorkerPositionService } from '@/modules/hr/worker-positions/worker-position.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerPositionController, WorkerPositionExtrasController],
  providers: [WorkerPositionService],
})
export class WorkerPositionModule {}
