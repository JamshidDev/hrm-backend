// Convert modul — DOCX→PDF servisni global eksport qiladi.

import { Global, Module } from '@nestjs/common';
import { ConvertService } from '@/shared/convert/convert.service';

@Global()
@Module({
  providers: [ConvertService],
  exports: [ConvertService],
})
export class ConvertModule {}
