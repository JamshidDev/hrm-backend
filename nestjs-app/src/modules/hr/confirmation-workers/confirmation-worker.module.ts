import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ConfirmationWorkerController } from '@/modules/hr/confirmation-workers/confirmation-worker.controller';
import { ConfirmationWorkerService } from '@/modules/hr/confirmation-workers/confirmation-worker.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [ConfirmationWorkerController],
  providers: [ConfirmationWorkerService],
})
export class ConfirmationWorkerModule {}
