import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { SignatureController } from '@/modules/confirmation/signature/signature.controller';

@Module({
  imports: [AuthModule],
  controllers: [SignatureController],
})
export class ConfirmationSignatureModule {}
