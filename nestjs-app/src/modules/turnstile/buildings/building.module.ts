import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { BuildingController } from '@/modules/turnstile/buildings/building.controller';
import { BuildingService } from '@/modules/turnstile/buildings/building.service';

@Module({
  imports: [AuthModule],
  controllers: [BuildingController],
  providers: [BuildingService],
})
export class BuildingModule {}
