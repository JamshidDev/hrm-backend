import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { HospitalController } from '@/modules/med/hospital/hospital.controller';
import { HospitalService } from '@/modules/med/hospital/hospital.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [HospitalController],
  providers: [HospitalService],
})
export class HospitalModule {}
