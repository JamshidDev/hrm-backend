import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerController } from '@/modules/hr/workers/worker.controller';
import { WorkerService } from '@/modules/hr/workers/worker.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
