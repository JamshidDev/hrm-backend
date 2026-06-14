import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerApplicationController } from '@/modules/hr/worker-applications/worker-application.controller';
import { WorkerApplicationService } from '@/modules/hr/worker-applications/worker-application.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerApplicationController],
  providers: [WorkerApplicationService],
  exports: [WorkerApplicationService],
})
export class WorkerApplicationModule {}
