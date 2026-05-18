import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { WorkerUserController } from '@/modules/hr/worker-users/worker-user.controller';
import { WorkerUserService } from '@/modules/hr/worker-users/worker-user.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [WorkerUserController],
  providers: [WorkerUserService],
})
export class WorkerUserModule {}
