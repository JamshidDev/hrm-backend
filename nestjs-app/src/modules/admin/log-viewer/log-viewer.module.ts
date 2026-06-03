import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LogViewerController } from '@/modules/admin/log-viewer/log-viewer.controller';

@Module({
  imports: [AuthModule],
  controllers: [LogViewerController],
})
export class LogViewerModule {}
