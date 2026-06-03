import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/modules/auth/auth.module';
import { SignatureController } from '@/modules/structure/signature/signature.controller';
import { SignatureService } from '@/modules/structure/signature/signature.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [SignatureController],
  providers: [SignatureService],
})
export class StructureSignatureModule {}
