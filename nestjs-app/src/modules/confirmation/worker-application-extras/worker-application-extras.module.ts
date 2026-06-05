import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  WorkerApplicationExtrasController,
  WorkerApplicationExtrasService,
} from '@/modules/confirmation/worker-application-extras/worker-application-extras.controller';
import { WorkerApplicationReplaceService } from '@/modules/hr/worker-applications/worker-application-replace.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerApplicationExtrasController],
  providers: [WorkerApplicationExtrasService, WorkerApplicationReplaceService],
})
export class WorkerApplicationExtrasModule {}
