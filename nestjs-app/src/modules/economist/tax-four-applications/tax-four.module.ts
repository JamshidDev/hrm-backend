import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TaxFourController } from '@/modules/economist/tax-four-applications/tax-four.controller';
import { TaxFourService } from '@/modules/economist/tax-four-applications/tax-four.service';

@Module({
  imports: [AuthModule],
  controllers: [TaxFourController],
  providers: [TaxFourService],
})
export class TaxFourModule {}
