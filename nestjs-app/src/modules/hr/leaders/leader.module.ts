import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { LeaderController } from '@/modules/hr/leaders/leader.controller';
import { LeaderService } from '@/modules/hr/leaders/leader.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [LeaderController],
  providers: [LeaderService],
})
export class LeaderModule {}
