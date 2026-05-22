import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { TranslateController } from '@/modules/services/translate/translate.controller';
import { TranslateService } from '@/modules/services/translate/translate.service';

@Module({
  imports: [AuthModule],
  controllers: [TranslateController],
  providers: [TranslateService],
})
export class TranslateModule {}
