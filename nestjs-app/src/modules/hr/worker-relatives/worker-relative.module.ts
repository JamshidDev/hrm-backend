import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import {
  WorkerRelativeController,
  WorkerRelativeSortableAliasController,
} from '@/modules/hr/worker-relatives/worker-relative.controller';
import { WorkerRelativeService } from '@/modules/hr/worker-relatives/worker-relative.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerRelativeController, WorkerRelativeSortableAliasController],
  providers: [WorkerRelativeService, WorkerUuidLookup],
})
export class WorkerRelativeModule {}
