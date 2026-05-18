import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ConfirmationsController } from '@/modules/confirmation/confirmations/confirmations.controller';
import { ConfirmationsService } from '@/modules/confirmation/confirmations/confirmations.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [ConfirmationsController],
  providers: [ConfirmationsService],
})
export class ConfirmationsListsModule {}
