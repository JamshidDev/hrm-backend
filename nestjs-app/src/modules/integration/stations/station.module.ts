import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { IntegrationStationController } from '@/modules/integration/stations/station.controller';
import { IntegrationStationService } from '@/modules/integration/stations/station.service';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationStationController],
  providers: [IntegrationStationService],
})
export class IntegrationStationModule {}
