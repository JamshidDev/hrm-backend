import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerPassportController } from '@/modules/hr/worker-passports/worker-passport.controller';
import { WorkerPassportService } from '@/modules/hr/worker-passports/worker-passport.service';
import { WorkerUuidLookup } from '@/modules/hr/_shared/worker-uuid.helper';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerPassportController],
  providers: [WorkerPassportService, WorkerUuidLookup],
})
export class WorkerPassportModule {}
