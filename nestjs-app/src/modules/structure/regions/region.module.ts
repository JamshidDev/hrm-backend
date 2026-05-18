import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { RegionController } from '@/modules/structure/regions/region.controller';
import { RegionService } from '@/modules/structure/regions/region.service';

@Module({
  imports: [AuthModule],
  controllers: [RegionController],
  providers: [RegionService],
})
export class RegionModule {}
