import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerAcademicDegreeController } from '@/modules/hr/worker-academic-degrees/worker-academic-degree.controller';
import { WorkerAcademicDegreeService } from '@/modules/hr/worker-academic-degrees/worker-academic-degree.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerAcademicDegreeController],
  providers: [WorkerAcademicDegreeService, WorkerUuidLookup],
})
export class WorkerAcademicDegreeModule {}
