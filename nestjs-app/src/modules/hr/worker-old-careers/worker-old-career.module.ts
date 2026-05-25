import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  WorkerOldCareerController,
  WorkerOldCareerSortableAliasController,
} from '@/modules/hr/worker-old-careers/worker-old-career.controller';
import { WorkerOldCareerService } from '@/modules/hr/worker-old-careers/worker-old-career.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule],
  controllers: [
    WorkerOldCareerController,
    WorkerOldCareerSortableAliasController,
  ],
  providers: [WorkerOldCareerService, WorkerUuidLookup],
})
export class WorkerOldCareerModule {}
