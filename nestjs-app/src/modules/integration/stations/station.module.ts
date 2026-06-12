import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationStationController } from '@/modules/integration/stations/station.controller';
import { IntegrationStationService } from '@/modules/integration/stations/station.service';
import { ResumeService } from '@/modules/hr/worker-exports/resume.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationStationController],
  providers: [IntegrationStationService, ResumeService],
})
export class IntegrationStationModule {}
