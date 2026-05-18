import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TurnstileEnumsController } from '@/modules/turnstile/enums-endpoint/enums.controller';

@Module({
  imports: [AuthModule],
  controllers: [TurnstileEnumsController],
})
export class TurnstileEnumsModule {}
