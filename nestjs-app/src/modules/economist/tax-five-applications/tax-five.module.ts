import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TaxFiveController } from '@/modules/economist/tax-five-applications/tax-five.controller';
import { TaxFiveService } from '@/modules/economist/tax-five-applications/tax-five.service';

@Module({
  imports: [AuthModule],
  controllers: [TaxFiveController],
  providers: [TaxFiveService],
})
export class TaxFiveModule {}
