import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerUniversityController } from '@/modules/hr/worker-universities/worker-university.controller';
import { WorkerUniversityService } from '@/modules/hr/worker-universities/worker-university.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerUniversityController],
  providers: [WorkerUniversityService, WorkerUuidLookup],
})
export class WorkerUniversityModule {}
