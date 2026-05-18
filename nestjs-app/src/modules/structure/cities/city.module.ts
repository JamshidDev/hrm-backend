import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { CityController } from '@/modules/structure/cities/city.controller';
import { CityService } from '@/modules/structure/cities/city.service';

@Module({
  imports: [AuthModule],
  controllers: [CityController],
  providers: [CityService],
})
export class CityModule {}
