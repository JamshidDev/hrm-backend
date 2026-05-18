import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UploadController } from '@/modules/economist/uploads/upload.controller';
import { UploadService } from '@/modules/economist/uploads/upload.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class EconomistUploadModule {}
