import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { VacancyAuthController } from '@/modules/vacancy/vacancy-auth/vacancy-auth.controller';
import { VacancyAuthService } from '@/modules/vacancy/vacancy-auth/vacancy-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [VacancyAuthController],
  providers: [VacancyAuthService],
})
export class VacancyAuthModule {}
