// Services module aggregator. Laravel: Modules/ProjectService.
// 1 ta sub-modul:
//   - translate: POST /api/v1/services/translate (LibreOffice/Pandoc stub)

import { Module } from '@nestjs/common';
import { TranslateModule } from '@/modules/services/translate/translate.module';

@Module({
  imports: [TranslateModule],
})
export class ServicesModule {}
