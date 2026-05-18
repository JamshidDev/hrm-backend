import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { MedWorkersController } from '@/modules/med/med-workers/med-workers.controller';
import { MedWorkersService } from '@/modules/med/med-workers/med-workers.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [MedWorkersController],
  providers: [MedWorkersService],
})
export class MedWorkersModule {}
