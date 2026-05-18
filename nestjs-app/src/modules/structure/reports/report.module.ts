import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ReportController } from '@/modules/structure/reports/report.controller';
import { ReportService } from '@/modules/structure/reports/report.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
