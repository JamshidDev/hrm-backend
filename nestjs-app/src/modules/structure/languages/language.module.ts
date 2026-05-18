import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { LanguageController } from '@/modules/structure/languages/language.controller';
import { LanguageService } from '@/modules/structure/languages/language.service';

@Module({
  imports: [AuthModule],
  controllers: [LanguageController],
  providers: [LanguageService],
})
export class LanguageModule {}
