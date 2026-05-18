import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { NationalityController } from '@/modules/hr/nationalities/nationality.controller';
import { NationalityService } from '@/modules/hr/nationalities/nationality.service';

@Module({
  imports: [AuthModule],
  controllers: [NationalityController],
  providers: [NationalityService],
})
export class NationalityModule {}
