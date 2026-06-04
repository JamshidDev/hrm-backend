import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@/modules/auth/auth.module';
import { ApplicationConfirmationController } from '@/modules/confirmation/application-confirmation/application-confirmation.controller';
import { ApplicationConfirmationService } from '@/modules/confirmation/application-confirmation/application-confirmation.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [ApplicationConfirmationController],
  providers: [ApplicationConfirmationService],
})
export class ApplicationConfirmationModule {}
