import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { CountryController } from '@/modules/structure/countries/country.controller';
import { CountryService } from '@/modules/structure/countries/country.service';

@Module({
  imports: [AuthModule],
  controllers: [CountryController],
  providers: [CountryService],
})
export class CountryModule {}
