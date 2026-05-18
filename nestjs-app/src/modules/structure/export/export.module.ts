import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ExportController } from '@/modules/structure/export/export.controller';
import { ExportService } from '@/modules/structure/export/export.service';

@Module({
  imports: [AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
