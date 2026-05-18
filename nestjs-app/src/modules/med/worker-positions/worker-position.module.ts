import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { MedWorkerPositionController } from '@/modules/med/worker-positions/worker-position.controller';
import { MedWorkerPositionService } from '@/modules/med/worker-positions/worker-position.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [MedWorkerPositionController],
  providers: [MedWorkerPositionService],
})
export class MedWorkerPositionModule {}
