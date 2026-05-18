import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerPhotoController } from '@/modules/hr/worker-photos/worker-photo.controller';
import { WorkerPhotoService } from '@/modules/hr/worker-photos/worker-photo.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerPhotoController],
  providers: [WorkerPhotoService],
})
export class WorkerPhotoModule {}
