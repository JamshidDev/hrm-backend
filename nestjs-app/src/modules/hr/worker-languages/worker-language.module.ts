import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerLanguageController } from '@/modules/hr/worker-languages/worker-language.controller';
import { WorkerLanguageService } from '@/modules/hr/worker-languages/worker-language.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerLanguageController],
  providers: [WorkerLanguageService, WorkerUuidLookup],
})
export class WorkerLanguageModule {}
