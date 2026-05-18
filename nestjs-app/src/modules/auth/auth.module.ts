import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/auth.controller';
import { OAuthController } from '@/modules/auth/oauth.controller';
import { AuthService } from '@/modules/auth/auth.service';
import { OAuthService } from '@/modules/auth/oauth.service';
import { SanctumService } from '@/modules/auth/sanctum.service';

@Module({
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService, SanctumService],
  exports: [AuthService, SanctumService],
})
export class AuthModule {}
