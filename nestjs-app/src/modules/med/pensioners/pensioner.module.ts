import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { MedPensionerController } from '@/modules/med/pensioners/pensioner.controller';
import { MedPensionerService } from '@/modules/med/pensioners/pensioner.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [MedPensionerController],
  providers: [MedPensionerService],
})
export class MedPensionerModule {}
