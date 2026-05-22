import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { SendedWorkerController } from '@/modules/med/sended-workers/sended-worker.controller';
import { SendedWorkerService } from '@/modules/med/sended-workers/sended-worker.service';
import { MedReplaceService } from '@/modules/med/sended-workers/med-replace.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [SendedWorkerController],
  providers: [SendedWorkerService, MedReplaceService],
})
export class SendedWorkerModule {}
