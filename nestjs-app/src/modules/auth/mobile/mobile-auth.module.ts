import { Module } from '@nestjs/common';
import { MobileAuthController } from '@/modules/auth/mobile/mobile-auth.controller';
import { MobileAuthService } from '@/modules/auth/mobile/mobile-auth.service';

@Module({
  controllers: [MobileAuthController],
  providers: [MobileAuthService],
})
export class MobileAuthModule {}
