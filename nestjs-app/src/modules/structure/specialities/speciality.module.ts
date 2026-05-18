import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { SpecialityController } from '@/modules/structure/specialities/speciality.controller';
import { SpecialityService } from '@/modules/structure/specialities/speciality.service';

@Module({
  imports: [AuthModule],
  controllers: [SpecialityController],
  providers: [SpecialityService],
})
export class SpecialityModule {}
