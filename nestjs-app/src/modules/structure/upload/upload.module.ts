import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { UploadController } from '@/modules/structure/upload/upload.controller';
import { UploadService } from '@/modules/structure/upload/upload.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
