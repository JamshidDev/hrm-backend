import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { MedController } from '@/modules/hr/meds/med.controller';
import { MedService } from '@/modules/hr/meds/med.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [MedController],
  providers: [MedService],
})
export class MedModule {}
