import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PensionPaymentController } from '@/modules/economist/pension-payments/pension-payment.controller';
import { PensionPaymentService } from '@/modules/economist/pension-payments/pension-payment.service';

@Module({
  imports: [AuthModule],
  controllers: [PensionPaymentController],
  providers: [PensionPaymentService],
})
export class PensionPaymentModule {}
