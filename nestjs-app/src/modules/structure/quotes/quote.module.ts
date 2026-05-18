import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import {
  QuoteController,
  QuoteRandomController,
} from '@/modules/structure/quotes/quote.controller';
import { QuoteService } from '@/modules/structure/quotes/quote.service';

@Module({
  imports: [AuthModule],
  controllers: [QuoteController, QuoteRandomController],
  providers: [QuoteService],
})
export class QuoteModule {}
