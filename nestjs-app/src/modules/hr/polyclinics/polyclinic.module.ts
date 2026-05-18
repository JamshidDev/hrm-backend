import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PolyclinicController } from '@/modules/hr/polyclinics/polyclinic.controller';
import { PolyclinicService } from '@/modules/hr/polyclinics/polyclinic.service';

@Module({
  imports: [AuthModule],
  controllers: [PolyclinicController],
  providers: [PolyclinicService],
})
export class PolyclinicModule {}
