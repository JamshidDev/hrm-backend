import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerAcademicTitleController } from '@/modules/hr/worker-academic-titles/worker-academic-title.controller';
import { WorkerAcademicTitleService } from '@/modules/hr/worker-academic-titles/worker-academic-title.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerAcademicTitleController],
  providers: [WorkerAcademicTitleService, WorkerUuidLookup],
})
export class WorkerAcademicTitleModule {}
