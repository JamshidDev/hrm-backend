import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MinioModule } from '@/shared/minio/minio.module';
import { ReportController } from '@/modules/hr/reports/report.controller';
import { ReportService } from '@/modules/hr/reports/report.service';

@Module({
  imports: [AuthModule, MinioModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
